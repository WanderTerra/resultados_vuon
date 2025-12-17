const { getDB } = require('../config/db');
const BlocoModel = require('./blocoModel');
const PagamentoModel = require('./pagamentoModel');
const NovacaoModel = require('./novacaoModel');

class ClientesVirgensModel {
    /**
     * Busca dados de clientes virgens (clientes que aparecem pela primeira vez), total de pagamentos e acordos
     * @param {number|string|null} bloco - Bloco para filtrar (1, 2, 3, 'wo') ou null para todos
     * @param {string|null} startDate - Data inicial para filtrar (formato: 'YYYY-MM-DD') ou null para todos
     * @param {string|null} endDate - Data final para filtrar (formato: 'YYYY-MM-DD') ou null para todos
     * @returns {Promise<Array>} Array com dados formatados [{ mes: 'YYYY-MM-01', qtd_clientes_virgens: number, total_pagamentos: number, total_acordos: number }, ...]
     */
    static async getClientesVirgens(bloco = null, startDate = null, endDate = null) {
        const db = await getDB();
        
        // Construir condição de filtro de atraso se bloco for fornecido
        let atrasoCondition = '';
        let pagamentoBlocoCondition = '';
        let acordosBlocoCondition = '';
        if (bloco !== null) {
            const blocoCondition = BlocoModel.getBlocoCondition(bloco);
            atrasoCondition = `AND ${blocoCondition}`;
            // Usar mesma lógica do PagamentoModel.getBlocoCondition (mesma do gráfico Acordos x Pagamentos)
            pagamentoBlocoCondition = PagamentoModel.getBlocoCondition(bloco);
            acordosBlocoCondition = NovacaoModel.getBlocoCondition(bloco);
        } else {
            pagamentoBlocoCondition = '1=1';
            acordosBlocoCondition = '1=1';
        }
        
        // Query para clientes virgens
        // IMPORTANTE: Aplicar filtros de data se fornecidos (mesma lógica do gráfico Acordos x Pagamentos)
        let dateFilterCondition = '';
        const queryParams = [];
        if (startDate && endDate) {
            dateFilterCondition = 'AND t.first_date >= ? AND t.first_date <= ?';
            queryParams.push(startDate, endDate);
        }
        
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
            WHERE 1=1 ${dateFilterCondition}
            GROUP BY mes
            ORDER BY mes
        `;
        
        // Query para total de pagamentos por mês
        // IMPORTANTE: Usar PagamentoModel.getPagamentosPorBloco() diretamente para garantir mesma lógica
        // que o gráfico "Acordos x Pagamentos" usa
        // IMPORTANTE: Passar startDate e endDate para filtrar os mesmos períodos
        // Isso garante que ambos usem exatamente a mesma query e condições
        let pagamentosFromModel = [];
        try {
            pagamentosFromModel = await PagamentoModel.getPagamentosPorBloco(bloco, startDate, endDate, 'month');
            if (!Array.isArray(pagamentosFromModel)) {
                console.warn('PagamentoModel.getPagamentosPorBloco returned non-array:', typeof pagamentosFromModel);
                pagamentosFromModel = [];
            }
        } catch (error) {
            console.error('Error fetching pagamentos:', error.message);
            console.error('Error stack:', error.stack);
            pagamentosFromModel = [];
        }
        
        // Converter para chave YYYY-MM-01 mas manter o date_formatted (MM/YYYY) igual ao gráfico Acordos x Pagamentos
        const pagamentosRows = pagamentosFromModel.map(item => {
            let mes = null;
            let dateFormatted = item.date || null; // item.date vem como MM/YYYY ou YYYY-MM
            if (item.date) {
                if (item.date.includes('/')) {
                    const [month, year] = item.date.split('/');
                    mes = `${year}-${month.padStart(2, '0')}-01`;
                } else if (item.date.includes('-')) {
                    mes = item.date.length === 7 ? `${item.date}-01` : item.date;
                    if (item.date.length === 7) {
                        const [year, month] = item.date.split('-');
                        dateFormatted = `${month}/${year}`;
                    }
                }
            }
            return mes ? {
                mes: mes,
                total_pagamentos: parseInt(item.quantidade_pagamentos || 0),
                date_formatted: dateFormatted
            } : null;
        }).filter(row => row !== null);
        
        // ACORDOS: usar o MESMO método do gráfico "Acordos x Pagamentos"
        // No BlocoModel, acordos vêm da view v_blocoX_acordos (criada em scripts/createBlocoViews.js),
        // que aplica filtros de agente e NÃO filtra tipo='NOV'. Para bater 1:1, replicar a mesma query mensal aqui.
        let acordosRows = [];
        if (bloco !== null) {
            const blocoName = bloco === 'wo' ? 'wo' : String(bloco);
            const acordosViewName = `v_bloco${blocoName}_acordos`;
            const acordosParams = [];
            const acordosDateFilter = (startDate && endDate) ? 'AND data >= ? AND data <= ?' : '';
            if (startDate && endDate) {
                acordosParams.push(startDate, endDate);
            }

            const acordosQuery = `
                SELECT 
                    date_month as date,
                    date_formatted,
                    SUM(total_acordos) as total_acordos
                FROM ${acordosViewName}
                WHERE 1=1 ${acordosDateFilter}
                GROUP BY ano, mes, date_month, date_formatted
                ORDER BY ano ASC, mes ASC
            `;

            try {
                const [rows] = acordosParams.length > 0
                    ? await db.execute(acordosQuery, acordosParams)
                    : await db.execute(acordosQuery);

                acordosRows = rows.map(r => ({
                    mes: `${r.date}-01`, // date_month vem como YYYY-MM
                    total_acordos: parseInt(r.total_acordos || 0),
                    date_formatted: r.date_formatted || null
                }));
            } catch (error) {
                console.error(`Error querying view ${acordosViewName}:`, error.message);
                console.error('Query:', acordosQuery);
                console.error('Params:', acordosParams);
                // Se a view não existir, retornar array vazio em vez de quebrar
                if (error.code === 'ER_NO_SUCH_TABLE' || error.message.includes('doesn\'t exist')) {
                    console.warn(`View ${acordosViewName} does not exist. Returning empty acordos data.`);
                    acordosRows = [];
                } else {
                    throw error; // Re-throw se for outro tipo de erro
                }
            }
        } else {
            // Caso sem bloco: manter o método antigo (mais "correto" por mês), pois não existe equivalente direto no BlocoModel
            const NovacaoModel = require('./novacaoModel');
            let acordosFromModel = [];
            try {
                acordosFromModel = await NovacaoModel.getAcordosPorBloco(bloco, startDate, endDate, 'month');
                if (!Array.isArray(acordosFromModel)) {
                    console.warn('NovacaoModel.getAcordosPorBloco returned non-array:', typeof acordosFromModel);
                    acordosFromModel = [];
                }
            } catch (error) {
                console.error('Error fetching acordos from NovacaoModel:', error.message);
                console.error('Error stack:', error.stack);
                acordosFromModel = [];
            }

            acordosRows = acordosFromModel.map(item => {
                let mes = null;
                let dateFormatted = item.date || null;
                if (item.date) {
                    if (item.date.includes('/')) {
                        const [month, year] = item.date.split('/');
                        mes = `${year}-${month.padStart(2, '0')}-01`;
                    } else if (item.date.includes('-')) {
                        mes = item.date.length === 7 ? `${item.date}-01` : item.date;
                        if (item.date.length === 7) {
                            const [year, month] = item.date.split('-');
                            dateFormatted = `${month}/${year}`;
                        }
                    }
                }
                return mes ? {
                    mes: mes,
                    total_acordos: parseInt(item.total_acordos || 0),
                    date_formatted: dateFormatted
                } : null;
            }).filter(row => row !== null);
        }
        
        // Executar query de clientes virgens
        const [clientesVirgensRows] = queryParams.length > 0 
            ? await db.execute(clientesVirgensQuery, queryParams)
            : await db.execute(clientesVirgensQuery);
        
        // Criar maps de pagamentos e acordos por mês, guardando também date_formatted
        const pagamentosMap = new Map();
        const pagamentosDateMap = new Map();
        pagamentosRows.forEach(row => {
            pagamentosMap.set(row.mes, parseInt(row.total_pagamentos || 0));
            if (row.date_formatted) {
                pagamentosDateMap.set(row.mes, row.date_formatted);
            }
        });
        
        const acordosMap = new Map();
        const acordosDateMap = new Map();
        acordosRows.forEach(row => {
            acordosMap.set(row.mes, parseInt(row.total_acordos || 0));
            if (row.date_formatted) {
                acordosDateMap.set(row.mes, row.date_formatted);
            }
        });
        
        // Coletar todos os meses únicos
        const allMonths = new Set();
        if (clientesVirgensRows && Array.isArray(clientesVirgensRows)) {
            clientesVirgensRows.forEach(row => allMonths.add(row.mes));
        }
        pagamentosRows.forEach(row => allMonths.add(row.mes));
        acordosRows.forEach(row => allMonths.add(row.mes));
        
        // Helper para formatar mes YYYY-MM-01 em MM/YYYY
        const formatMonth = (mes) => {
            if (!mes || mes.length < 7) return null;
            const year = mes.slice(0, 4);
            const month = mes.slice(5, 7);
            return `${month}/${year}`;
        };
        
        // Combinar dados de todos os meses
        const combinedData = Array.from(allMonths).map(mes => {
            const dateFormatted =
                pagamentosDateMap.get(mes) ||
                acordosDateMap.get(mes) ||
                formatMonth(mes);
            const clientesVirgensRow = clientesVirgensRows && Array.isArray(clientesVirgensRows) 
                ? clientesVirgensRows.find(cv => cv.mes === mes)
                : null;
            return {
                mes: mes,
                date_formatted: dateFormatted,
                qtd_clientes_virgens: clientesVirgensRow?.qtd_clientes_virgens || 0,
                total_pagamentos: pagamentosMap.get(mes) || 0,
                total_acordos: acordosMap.get(mes) || 0
            };
        });
        
        // Ordenar por mês
        combinedData.sort((a, b) => a.mes.localeCompare(b.mes));
        
        return combinedData;
    }
}

module.exports = ClientesVirgensModel;

