const { getDB } = require('../config/db');

class NovacaoModel {
    // Função auxiliar para definir o bloco baseado em dias de atraso
    // Usa atraso_real (coluna correta na tabela vuon_novacoes)
    static getBlocoCondition(bloco) {
        switch(bloco) {
            case 1:
                // BLOCO 1: 61 a 90 dias de atraso
                return "atraso_real >= 61 AND atraso_real <= 90";
            case 2:
                // BLOCO 2: 91 a 180 dias de atraso
                return "atraso_real >= 91 AND atraso_real <= 180";
            case 3:
                // BLOCO 3: 181 a 360 dias de atraso
                return "atraso_real >= 181 AND atraso_real <= 360";
            case 'wo':
                // WO: 360 a 9999 dias de atraso
                return "atraso_real >= 360 AND atraso_real <= 9999";
            default:
                return "1=1"; // Todos os registros
        }
    }

    // Buscar acordos agrupados por CPF (somando parcelas) e por mês
    // Agrupa acordos do mesmo CPF como um único acordo e soma os valores
    static async getAcordosPorBloco(bloco, startDate = null, endDate = null) {
        const db = await getDB();
        const blocoCondition = this.getBlocoCondition(bloco);
        
        // Usar prepared statements para melhor performance e segurança
        let dateFilter = '';
        const queryParams = [];
        
        if (startDate && endDate) {
            dateFilter = `AND DATE(data_emissao) >= ? AND DATE(data_emissao) <= ?`;
            queryParams.push(startDate, endDate);
        }

        // Query que agrupa acordos por CPF e mês
        // Cada CPF representa um acordo único (mesmo que tenha múltiplas parcelas)
        // Soma os valores de todas as parcelas do mesmo CPF
        // Usa data_emissao como coluna de data do acordo
        const query = `
            SELECT 
                CONCAT(YEAR(DATE(data_emissao)), '-', LPAD(MONTH(DATE(data_emissao)), 2, '0')) as date,
                CONCAT(LPAD(MONTH(DATE(data_emissao)), 2, '0'), '/', YEAR(DATE(data_emissao))) as date_formatted,
                COUNT(DISTINCT cpf_cnpj) as total_acordos,
                COALESCE(SUM(valor_total), 0) as valor_total
            FROM vuon_novacoes
            WHERE tipo = 'NOV'
                AND atraso_real IS NOT NULL
                AND ${blocoCondition}
                ${dateFilter}
            GROUP BY YEAR(DATE(data_emissao)), MONTH(DATE(data_emissao))
            ORDER BY YEAR(DATE(data_emissao)) ASC, MONTH(DATE(data_emissao)) ASC
        `;

        const [rows] = queryParams.length > 0 
            ? await db.execute(query, queryParams)
            : await db.execute(query);
        
        return rows.map(row => ({
            date: row.date_formatted || row.date,
            total_acordos: parseInt(row.total_acordos || 0),
            valor_total: parseFloat(row.valor_total || 0)
        }));
    }

    // Buscar acordos agrupados por CPF para um período específico
    // Retorna a contagem de acordos únicos (por CPF) e o valor total
    static async getTotalAcordosPorBloco(bloco, startDate = null, endDate = null) {
        const db = await getDB();
        const blocoCondition = this.getBlocoCondition(bloco);
        
        let dateFilter = '';
        const queryParams = [];
        
        if (startDate && endDate) {
            dateFilter = `AND DATE(data_emissao) >= ? AND DATE(data_emissao) <= ?`;
            queryParams.push(startDate, endDate);
        }

        const query = `
            SELECT 
                COUNT(DISTINCT cpf_cnpj) as total_acordos,
                COALESCE(SUM(valor_total), 0) as valor_total
            FROM vuon_novacoes
            WHERE tipo = 'NOV'
                AND atraso_real IS NOT NULL
                AND ${blocoCondition}
                ${dateFilter}
        `;

        const [rows] = queryParams.length > 0 
            ? await db.execute(query, queryParams)
            : await db.execute(query);
        
        return {
            total_acordos: parseInt(rows[0]?.total_acordos || 0),
            valor_total: parseFloat(rows[0]?.valor_total || 0)
        };
    }
}

module.exports = NovacaoModel;

