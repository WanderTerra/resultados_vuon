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

    // Buscar acordos agrupados por CPF (somando parcelas) e por mês ou dia
    // Agrupa acordos do mesmo CPF como um único acordo e soma os valores
    static async getAcordosPorBloco(bloco, startDate = null, endDate = null, groupBy = 'month') {
        const db = await getDB();
        const blocoCondition = this.getBlocoCondition(bloco);
        
        // Usar prepared statements para melhor performance e segurança
        let dateFilter = '';
        const queryParams = [];
        
        if (startDate && endDate) {
            dateFilter = `AND DATE(data_emissao) >= ? AND DATE(data_emissao) <= ?`;
            queryParams.push(startDate, endDate);
        }

        let dateSelect, dateFormatted, groupByClause, orderByClause;
        
        if (groupBy === 'day') {
            // Agrupamento por dia
            dateSelect = `DATE(data_emissao) as date`;
            dateFormatted = `DATE_FORMAT(data_emissao, '%d/%m/%Y') as date_formatted`;
            groupByClause = `DATE(data_emissao)`;
            orderByClause = `DATE(data_emissao) ASC`;
        } else {
            // Agrupamento por mês (usa view otimizada)
            const blocoStr = typeof bloco === 'string' ? bloco : bloco.toString();
            const viewDateFilter = startDate && endDate 
                ? `AND date_key >= '${startDate.substring(0, 7)}' AND date_key <= '${endDate.substring(0, 7)}'`
                : '';
            
            const query = `
                SELECT 
                    date_key as date,
                    date_formatted,
                    total_acordos,
                    valor_total
                FROM vw_acordos_por_bloco_mes
                WHERE bloco = ?
                    ${viewDateFilter}
                ORDER BY date_key ASC
            `;
            
            const [rows] = await db.execute(query, [blocoStr]);
            
            return rows.map(row => ({
                date: row.date_formatted || row.date,
                total_acordos: parseInt(row.total_acordos || 0),
                valor_total: parseFloat(row.valor_total || 0)
            }));
        }

        // Query direta para agrupamento por dia (agrupa por CPF e data)
        // OTIMIZADA: usa YEAR/MONTH no GROUP BY para melhor performance
        const query = `
            SELECT 
                ${dateSelect},
                ${dateFormatted},
                COUNT(DISTINCT cpf_cnpj) as total_acordos,
                COALESCE(SUM(valor_total), 0) as valor_total
            FROM (
                SELECT 
                    cpf_cnpj,
                    DATE(data_emissao) as data_emissao,
                    SUM(valor_total) as valor_total
                FROM vuon_novacoes
                WHERE tipo = 'NOV'
                    AND atraso_real IS NOT NULL
                    AND ${blocoCondition}
                    ${dateFilter}
                GROUP BY cpf_cnpj, DATE(data_emissao)
            ) as acordos_agrupados
            GROUP BY ${groupByClause}
            ORDER BY ${orderByClause}
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
        
        let dateFilter = '';
        const queryParams = [bloco];
        
        if (startDate && endDate) {
            dateFilter = `AND date_key >= ? AND date_key <= ?`;
            queryParams.push(
                `${startDate.substring(0, 7)}`, // YYYY-MM
                `${endDate.substring(0, 7)}`    // YYYY-MM
            );
        }

        // Query otimizada usando view
        const query = `
            SELECT 
                SUM(total_acordos) as total_acordos,
                SUM(valor_total) as valor_total
            FROM vw_acordos_por_bloco_mes
            WHERE bloco = ?
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

