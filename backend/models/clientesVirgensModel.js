const { getDB } = require('../config/db');
const BlocoModel = require('./blocoModel');

class ClientesVirgensModel {
    /**
     * Retorna clientes únicos por mês (qtd de CPFs distintos) para um bloco.
     * Formato esperado pelo frontend:
     * - mes: 'YYYY-MM-01'
     * - date_formatted: 'MM/YYYY'
     * - qtd_clientes_virgens: number
     * - total_acordos?: number (opcional; ajuda no fallback do gráfico)
     */
    static async getClientesVirgens(bloco = null, startDate = null, endDate = null) {
        const db = await getDB();

        // Caso agregado (sem bloco): contar CPFs únicos por mês em toda a base
        // (não dá para somar blocos sem duplicar CPFs entre faixas)
        if (!bloco) {
            const params = [];
            let dateFilter = '';
            if (startDate && endDate) {
                dateFilter = `AND DATE(data) >= ? AND DATE(data) <= ?`;
                params.push(startDate, endDate);
            }

            const query = `
                SELECT
                    CONCAT(YEAR(data), '-', LPAD(MONTH(data), 2, '0'), '-01') as mes,
                    CONCAT(LPAD(MONTH(data), 2, '0'), '/', YEAR(data)) as date_formatted,
                    COUNT(DISTINCT cpf_cnpj) as qtd_clientes_virgens
                FROM vuon_resultados
                WHERE cpf_cnpj IS NOT NULL
                    AND cpf_cnpj <> ''
                    ${dateFilter}
                GROUP BY YEAR(data), MONTH(data)
                ORDER BY YEAR(data) ASC, MONTH(data) ASC
            `;

            const [rows] = params.length ? await db.execute(query, params) : await db.execute(query);
            return (rows || []).map(r => ({
                mes: r.mes,
                date_formatted: r.date_formatted,
                qtd_clientes_virgens: parseInt(r.qtd_clientes_virgens || 0, 10),
            }));
        }

        // Bloco específico: usar bloco_summary (rápido) quando disponível
        const blocoName = bloco === 'wo' ? 'wo' : String(bloco);
        let clientesRows = [];

        try {
            const params = [blocoName];
            let summaryFilter = '';

            if (startDate && endDate) {
                const startYear = parseInt(startDate.split('-')[0], 10);
                const startMonth = parseInt(startDate.split('-')[1], 10);
                const endYear = parseInt(endDate.split('-')[0], 10);
                const endMonth = parseInt(endDate.split('-')[1], 10);

                summaryFilter = `AND (
                    (ano > ? OR (ano = ? AND mes >= ?))
                    AND (ano < ? OR (ano = ? AND mes <= ?))
                )`;
                params.push(startYear, startYear, startMonth, endYear, endYear, endMonth);
            }

            const query = `
                SELECT
                    CONCAT(ano, '-', LPAD(mes, 2, '0'), '-01') as mes,
                    date_formatted,
                    carteira as qtd_clientes_virgens
                FROM bloco_summary
                WHERE bloco = ?
                    ${summaryFilter}
                ORDER BY ano ASC, mes ASC
            `;

            const [rows] = await db.execute(query, params);
            clientesRows = rows || [];
        } catch (error) {
            // Fallback: contar direto em vuon_resultados
            const blocoCondition = BlocoModel.getBlocoCondition(bloco);
            const params = [];
            let dateFilter = '';
            if (startDate && endDate) {
                dateFilter = `AND DATE(data) >= ? AND DATE(data) <= ?`;
                params.push(startDate, endDate);
            }

            const query = `
                SELECT
                    CONCAT(YEAR(data), '-', LPAD(MONTH(data), 2, '0'), '-01') as mes,
                    CONCAT(LPAD(MONTH(data), 2, '0'), '/', YEAR(data)) as date_formatted,
                    COUNT(DISTINCT cpf_cnpj) as qtd_clientes_virgens
                FROM vuon_resultados
                WHERE ${blocoCondition}
                    AND cpf_cnpj IS NOT NULL
                    AND cpf_cnpj <> ''
                    ${dateFilter}
                GROUP BY YEAR(data), MONTH(data)
                ORDER BY YEAR(data) ASC, MONTH(data) ASC
            `;
            const [rows] = params.length ? await db.execute(query, params) : await db.execute(query);
            clientesRows = rows || [];
        }

        // Opcional: total de acordos por mês (para fallback do gráfico)
        // Usa view otimizada (vw_acordos_por_bloco_mes), que já trabalha por bloco e mês
        let acordosMap = new Map();
        try {
            const params = [blocoName];
            let dateFilter = '';
            if (startDate && endDate) {
                // date_key no formato YYYY-MM
                dateFilter = `AND date_key >= ? AND date_key <= ?`;
                params.push(startDate.substring(0, 7), endDate.substring(0, 7));
            }
            const query = `
                SELECT date_key as mes_key, total_acordos
                FROM vw_acordos_por_bloco_mes
                WHERE bloco = ?
                    ${dateFilter}
                ORDER BY date_key ASC
            `;
            const [rows] = await db.execute(query, params);
            (rows || []).forEach(r => {
                const mesKey = r.mes_key ? `${r.mes_key}-01` : null; // YYYY-MM-01
                if (!mesKey) return;
                acordosMap.set(mesKey, parseInt(r.total_acordos || 0, 10));
            });
        } catch (_) {
            // se a view não existir, apenas não devolve total_acordos
            acordosMap = new Map();
        }

        return (clientesRows || []).map(r => {
            const mes = r.mes;
            const date_formatted = r.date_formatted || (mes ? `${mes.slice(5, 7)}/${mes.slice(0, 4)}` : '');
            const qtd = parseInt(r.qtd_clientes_virgens || r.carteira || 0, 10);
            const totalAcordos = acordosMap.get(mes) || 0;
            return {
                mes,
                date_formatted,
                qtd_clientes_virgens: qtd,
                total_acordos: totalAcordos,
            };
        });
    }
}

module.exports = ClientesVirgensModel;