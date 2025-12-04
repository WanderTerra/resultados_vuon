const { getDB } = require('../config/db');
const BlocoModel = require('./blocoModel');
const PagamentoModel = require('./pagamentoModel');
const NovacaoModel = require('./novacaoModel');

class ClientesVirgensModel {
    /**
     * Busca dados de clientes virgens (clientes que aparecem pela primeira vez), total de pagamentos e acordos
     * @param {number|string|null} bloco - Bloco para filtrar (1, 2, 3, 'wo') ou null para todos
     * @returns {Promise<Array>} Array com dados formatados [{ mes: 'YYYY-MM-01', qtd_clientes_virgens: number, total_pagamentos: number, total_acordos: number }, ...]
     */
    static async getClientesVirgens(bloco = null) {
        const db = await getDB();
        
        // Construir condição de filtro de atraso se bloco for fornecido
        let atrasoCondition = '';
        let pagamentoBlocoCondition = '';
        let acordosBlocoCondition = '';
        if (bloco !== null) {
            const blocoCondition = BlocoModel.getBlocoCondition(bloco);
            atrasoCondition = `AND ${blocoCondition}`;
            pagamentoBlocoCondition = PagamentoModel.getBlocoCondition(bloco);
            acordosBlocoCondition = NovacaoModel.getBlocoCondition(bloco);
        } else {
            pagamentoBlocoCondition = '1=1';
            acordosBlocoCondition = '1=1';
        }
        
        // Query para clientes virgens
        const clientesVirgensQuery = `
            SELECT
                DATE_FORMAT(t.first_date, '%Y-%m-01') AS mes,
                COUNT(*) AS qtd_clientes_virgens
            FROM (
                SELECT
                    cpf_cnpj,
                    MIN(data) AS first_date
                FROM vuon_resultados
                WHERE
                    cpf_cnpj IS NOT NULL
                    AND cpf_cnpj <> ''
                    ${atrasoCondition}
                GROUP BY cpf_cnpj
            ) AS t
            GROUP BY mes
            ORDER BY mes
        `;
        
        // Query para total de pagamentos por mês
        const pagamentosQuery = `
            SELECT
                CONCAT(YEAR(data_pagamento), '-', LPAD(MONTH(data_pagamento), 2, '0'), '-01') AS mes,
                COUNT(*) AS total_pagamentos
            FROM vuon_bordero_pagamento
            WHERE
                data_pagamento IS NOT NULL
                AND valor_recebido > 0
                AND (${pagamentoBlocoCondition})
            GROUP BY YEAR(data_pagamento), MONTH(data_pagamento)
            ORDER BY YEAR(data_pagamento), MONTH(data_pagamento)
        `;
        
        // Query para total de acordos por mês
        const acordosQuery = `
            SELECT
                CONCAT(YEAR(data_emissao), '-', LPAD(MONTH(data_emissao), 2, '0'), '-01') AS mes,
                COUNT(DISTINCT cpf_cnpj) AS total_acordos
            FROM (
                SELECT 
                    cpf_cnpj,
                    DATE(data_emissao) as data_emissao
                FROM vuon_novacoes
                WHERE tipo = 'NOV'
                    AND atraso_real IS NOT NULL
                    AND (${acordosBlocoCondition})
                GROUP BY cpf_cnpj, DATE(data_emissao)
            ) as acordos_agrupados
            GROUP BY YEAR(data_emissao), MONTH(data_emissao)
            ORDER BY YEAR(data_emissao), MONTH(data_emissao)
        `;
        
        // Executar todas as queries em paralelo
        const [clientesVirgensRows, pagamentosRows, acordosRows] = await Promise.all([
            db.execute(clientesVirgensQuery),
            db.execute(pagamentosQuery),
            db.execute(acordosQuery)
        ]);
        
        // Criar maps de pagamentos e acordos por mês
        const pagamentosMap = new Map();
        pagamentosRows[0].forEach(row => {
            pagamentosMap.set(row.mes, parseInt(row.total_pagamentos || 0));
        });
        
        const acordosMap = new Map();
        acordosRows[0].forEach(row => {
            acordosMap.set(row.mes, parseInt(row.total_acordos || 0));
        });
        
        // Coletar todos os meses únicos
        const allMonths = new Set();
        clientesVirgensRows[0].forEach(row => allMonths.add(row.mes));
        pagamentosRows[0].forEach(row => allMonths.add(row.mes));
        acordosRows[0].forEach(row => allMonths.add(row.mes));
        
        // Combinar dados de todos os meses
        const combinedData = Array.from(allMonths).map(mes => ({
            mes: mes,
            qtd_clientes_virgens: clientesVirgensRows[0].find(cv => cv.mes === mes)?.qtd_clientes_virgens || 0,
            total_pagamentos: pagamentosMap.get(mes) || 0,
            total_acordos: acordosMap.get(mes) || 0
        }));
        
        // Ordenar por mês
        combinedData.sort((a, b) => a.mes.localeCompare(b.mes));
        
        return combinedData;
    }
}

module.exports = ClientesVirgensModel;

