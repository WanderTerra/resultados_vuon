const { getDB } = require('../config/db');
const BlocoModel = require('./blocoModel');
const PagamentoModel = require('./pagamentoModel');
const NovacaoModel = require('./novacaoModel');

class ClientesVirgensModel {
    /**
     * Busca dados de clientes virgens (clientes que aparecem pela primeira vez), valores em R$ de pagamentos e acordos
     * @param {number|string|null} bloco - Bloco para filtrar (1, 2, 3, 'wo') ou null para todos
     * @param {string|null} startDate - Data inicial no formato 'YYYY-MM-DD' ou null
     * @param {string|null} endDate - Data final no formato 'YYYY-MM-DD' ou null
     * @param {string} groupBy - Agrupamento: 'month' ou 'day'
     * @returns {Promise<Array>} Array com dados formatados [{ mes/data: 'YYYY-MM-01' ou 'YYYY-MM-DD', qtd_clientes_virgens: number, total_pagamentos: number, valor_pagamentos: number, total_acordos: number, valor_acordos: number }, ...]
     */
    static async getClientesVirgens(bloco = null, startDate = null, endDate = null, groupBy = 'month') {
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
        
        // Construir condições de filtro de data
        // Validar formato de data (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        let clientesVirgensDateCondition = '';
        let pagamentosDateCondition = '';
        let acordosDateCondition = '';
        let hasDateFilter = false;
        
        if (startDate && endDate && dateRegex.test(startDate) && dateRegex.test(endDate)) {
            hasDateFilter = true;
            // Para clientes virgens, filtrar pela primeira data de aparição
            clientesVirgensDateCondition = `AND t.first_date >= ? AND t.first_date <= ?`;
            // Para pagamentos, filtrar pela data de pagamento
            pagamentosDateCondition = `AND data_pagamento >= ? AND data_pagamento <= ?`;
            // Para acordos, filtrar pela data de emissão
            acordosDateCondition = `AND DATE(data_emissao) >= ? AND DATE(data_emissao) <= ?`;
        }
        
        // Query para clientes virgens - construir dinamicamente baseado no groupBy
        let clientesVirgensQuery;
        if (groupBy === 'day') {
            clientesVirgensQuery = `
                SELECT
                    DATE_FORMAT(t.first_date, '%Y-%m-%d') AS data,
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
                WHERE 1=1
                    ${clientesVirgensDateCondition}
                GROUP BY DATE_FORMAT(t.first_date, '%Y-%m-%d')
                ORDER BY DATE_FORMAT(t.first_date, '%Y-%m-%d')
            `;
        } else {
            clientesVirgensQuery = `
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
                WHERE 1=1
                    ${clientesVirgensDateCondition}
                GROUP BY DATE_FORMAT(t.first_date, '%Y-%m-01')
                ORDER BY DATE_FORMAT(t.first_date, '%Y-%m-01')
            `;
        }
        
        // Query para quantidade e valor total de pagamentos - construir dinamicamente
        // IMPORTANTE: Usar mesma lógica do PagamentoModel.getPagamentosPorBloco:
        // - Contar apenas entradas (parcela = 1) - um acordo parcelado conta como 1 pagamento apenas
        // - Usar COUNT(DISTINCT cpf_cnpj) para garantir que cada CPF conta apenas 1 vez
        let pagamentosQuery;
        if (groupBy === 'day') {
            pagamentosQuery = `
                SELECT
                    DATE(data_pagamento) AS data,
                    COUNT(DISTINCT cpf_cnpj) AS total_pagamentos,
                    COALESCE(SUM(valor_recebido), 0) AS valor_pagamentos
                FROM vuon_bordero_pagamento
                WHERE
                    data_pagamento IS NOT NULL
                    AND valor_recebido > 0
                    AND parcela = 1
                    AND (${pagamentoBlocoCondition})
                    ${pagamentosDateCondition}
                GROUP BY DATE(data_pagamento)
                ORDER BY DATE(data_pagamento)
            `;
        } else {
            pagamentosQuery = `
                SELECT
                    CONCAT(YEAR(data_pagamento), '-', LPAD(MONTH(data_pagamento), 2, '0'), '-01') AS mes,
                    COUNT(DISTINCT cpf_cnpj) AS total_pagamentos,
                    COALESCE(SUM(valor_recebido), 0) AS valor_pagamentos
                FROM vuon_bordero_pagamento
                WHERE
                    data_pagamento IS NOT NULL
                    AND valor_recebido > 0
                    AND parcela = 1
                    AND (${pagamentoBlocoCondition})
                    ${pagamentosDateCondition}
                GROUP BY YEAR(data_pagamento), MONTH(data_pagamento)
                ORDER BY YEAR(data_pagamento), MONTH(data_pagamento)
            `;
        }
        
        // Query para quantidade e valor total de acordos - construir dinamicamente
        let acordosQuery;
        if (groupBy === 'day') {
            acordosQuery = `
                SELECT
                    DATE(data_emissao) AS data,
                    COUNT(DISTINCT cpf_cnpj) AS total_acordos,
                    COALESCE(SUM(valor_total), 0) AS valor_acordos
                FROM (
                    SELECT 
                        cpf_cnpj,
                        DATE(data_emissao) as data_emissao,
                        SUM(valor_total) as valor_total
                    FROM vuon_novacoes
                    WHERE tipo = 'NOV'
                        AND atraso_real IS NOT NULL
                        AND (${acordosBlocoCondition})
                        ${acordosDateCondition}
                    GROUP BY cpf_cnpj, DATE(data_emissao)
                ) as acordos_agrupados
                GROUP BY DATE(data_emissao)
                ORDER BY DATE(data_emissao)
            `;
        } else {
            acordosQuery = `
                SELECT
                    CONCAT(YEAR(data_emissao), '-', LPAD(MONTH(data_emissao), 2, '0'), '-01') AS mes,
                    COUNT(DISTINCT cpf_cnpj) AS total_acordos,
                    COALESCE(SUM(valor_total), 0) AS valor_acordos
                FROM (
                    SELECT 
                        cpf_cnpj,
                        DATE(data_emissao) as data_emissao,
                        SUM(valor_total) as valor_total
                    FROM vuon_novacoes
                    WHERE tipo = 'NOV'
                        AND atraso_real IS NOT NULL
                        AND (${acordosBlocoCondition})
                        ${acordosDateCondition}
                    GROUP BY cpf_cnpj, DATE(data_emissao)
                ) as acordos_agrupados
                GROUP BY YEAR(data_emissao), MONTH(data_emissao)
                ORDER BY YEAR(data_emissao), MONTH(data_emissao)
            `;
        }
        
        // Executar todas as queries em paralelo
        // Se houver filtro de data, passar os parâmetros usando prepared statements
        const dateParams = hasDateFilter ? [startDate, endDate] : [];
        
        const [clientesVirgensRows, pagamentosRows, acordosRows] = await Promise.all([
            hasDateFilter 
                ? db.execute(clientesVirgensQuery, dateParams)
                : db.execute(clientesVirgensQuery),
            hasDateFilter 
                ? db.execute(pagamentosQuery, dateParams)
                : db.execute(pagamentosQuery),
            hasDateFilter 
                ? db.execute(acordosQuery, dateParams)
                : db.execute(acordosQuery)
        ]);
        
        // Criar maps de quantidades e valores de pagamentos e acordos
        const pagamentosMap = new Map();
        pagamentosRows[0].forEach(row => {
            // Normalizar a chave: se for Date object, converter para string YYYY-MM-DD
            let key = row.mes || row.data;
            if (key instanceof Date) {
                key = key.toISOString().split('T')[0];
            } else if (key && typeof key === 'string' && key.includes('T')) {
                key = key.split('T')[0];
            }
            pagamentosMap.set(key, {
                total: parseInt(row.total_pagamentos || 0),
                valor: parseFloat(row.valor_pagamentos || 0)
            });
        });
        
        const acordosMap = new Map();
        acordosRows[0].forEach(row => {
            // Normalizar a chave: se for Date object, converter para string YYYY-MM-DD
            let key = row.mes || row.data;
            if (key instanceof Date) {
                key = key.toISOString().split('T')[0];
            } else if (key && typeof key === 'string' && key.includes('T')) {
                key = key.split('T')[0];
            }
            acordosMap.set(key, {
                total: parseInt(row.total_acordos || 0),
                valor: parseFloat(row.valor_acordos || 0)
            });
        });
        
        // Coletar todas as datas/meses únicos
        const allDates = new Set();
        clientesVirgensRows[0].forEach(row => {
            let key = row.mes || row.data;
            if (key instanceof Date) {
                key = key.toISOString().split('T')[0];
            } else if (key && typeof key === 'string' && key.includes('T')) {
                key = key.split('T')[0];
            }
            allDates.add(key);
        });
        pagamentosRows[0].forEach(row => {
            let key = row.mes || row.data;
            if (key instanceof Date) {
                key = key.toISOString().split('T')[0];
            } else if (key && typeof key === 'string' && key.includes('T')) {
                key = key.split('T')[0];
            }
            allDates.add(key);
        });
        acordosRows[0].forEach(row => {
            let key = row.mes || row.data;
            if (key instanceof Date) {
                key = key.toISOString().split('T')[0];
            } else if (key && typeof key === 'string' && key.includes('T')) {
                key = key.split('T')[0];
            }
            allDates.add(key);
        });
        
        // Combinar dados de todas as datas/meses
        const combinedData = Array.from(allDates).map(dateKey => {
            const pagamentoData = pagamentosMap.get(dateKey) || { total: 0, valor: 0 };
            const acordoData = acordosMap.get(dateKey) || { total: 0, valor: 0 };
            
            // Normalizar chave para buscar em clientesVirgensRows
            const findKey = (row) => {
                let key = row.mes || row.data;
                if (key instanceof Date) {
                    key = key.toISOString().split('T')[0];
                } else if (key && typeof key === 'string' && key.includes('T')) {
                    key = key.split('T')[0];
                }
                return key === dateKey;
            };
            
            const result = {
                qtd_clientes_virgens: clientesVirgensRows[0].find(findKey)?.qtd_clientes_virgens || 0,
                total_pagamentos: pagamentoData.total,
                valor_pagamentos: pagamentoData.valor,
                total_acordos: acordoData.total,
                valor_acordos: acordoData.valor
            };
            
            // Adicionar campo apropriado (mes ou data)
            if (groupBy === 'day') {
                result.data = dateKey;
            } else {
                result.mes = dateKey;
            }
            
            return result;
        });
        
        // Ordenar por data/mês
        combinedData.sort((a, b) => {
            const aKey = (a.mes || a.data || '').toString();
            const bKey = (b.mes || b.data || '').toString();
            if (!aKey || !bKey) {
                return aKey ? 1 : (bKey ? -1 : 0);
            }
            
            // Se for formato de data (YYYY-MM-DD), ordenar como data
            // Se for formato de mês (YYYY-MM-01), ordenar como string (já está ordenado)
            const aIsDate = aKey.match(/^\d{4}-\d{2}-\d{2}$/);
            const bIsDate = bKey.match(/^\d{4}-\d{2}-\d{2}$/);
            
            if (aIsDate && bIsDate) {
                // Comparar como datas
                const aDate = new Date(aKey);
                const bDate = new Date(bKey);
                return aDate.getTime() - bDate.getTime();
            }
            
            // Caso contrário, ordenar como string
            return aKey.localeCompare(bKey);
        });
        
        return combinedData;
    }
}

module.exports = ClientesVirgensModel;
