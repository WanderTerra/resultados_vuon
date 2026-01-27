const { getDB } = require('../config/db');
const PagamentoModel = require('./pagamentoModel');
const AgentesModel = require('./agentesModel');

class ProdutividadeModel {
    /**
     * Busca dados de produtividade agregados por bloco e período.
     * A base são os recebimentos em `vuon_bordero_pagamento`.
     *
     * Estrutura de retorno pensada para o `ProdutividadeChart.jsx`:
     * {
     *   resumo: {
     *     total_valor_recebido,
     *     total_acordos,
     *     media_por_acordo
     *   },
     *   agentes: [{ id, nome }],
     *   porBloco: {
     *     bloco1: [{ date, valor_recebido, num_acordos }],
     *     bloco2: [...],
     *     bloco3: [...],
     *     wo: [...]
     *   }
     * }
     */
    static async getProdutividadeData(agenteId = null, startDate = null, endDate = null, groupBy = 'month') {
        // Datas padrão: últimos 6 meses até hoje, se nada for informado
        if (!startDate || !endDate) {
            const now = new Date();
            const end = endDate || now.toISOString().split('T')[0];
            const startDateObj = new Date(now);
            startDateObj.setMonth(startDateObj.getMonth() - 5);
            const start = startDate || startDateObj.toISOString().split('T')[0];
            startDate = start;
            endDate = end;
        }

        // Buscar recebimentos por bloco reutilizando PagamentoModel
        const blocos = [1, 2, 3, 'wo'];

        const porBloco = {};
        let totalValor = 0;
        let totalAcordos = 0;

        for (const bloco of blocos) {
            const dadosBloco = await PagamentoModel.getRecebimentoData(
                bloco,
                startDate,
                endDate,
                groupBy === 'day' ? 'day' : 'month'
            );

            const lista =
                groupBy === 'day'
                    ? dadosBloco.porDia
                    : dadosBloco.porMes;

            const mapped = (lista || []).map(item => {
                const valor = Number(item.valor_recebido || 0);
                const acordos = Number(item.quantidade_pagamentos || 0);
                totalValor += valor;
                totalAcordos += acordos;
                return {
                    date: item.date,
                    valor_recebido: valor,
                    num_acordos: acordos
                };
            });

            if (bloco === 1) porBloco.bloco1 = mapped;
            else if (bloco === 2) porBloco.bloco2 = mapped;
            else if (bloco === 3) porBloco.bloco3 = mapped;
            else porBloco.wo = mapped;
        }

        const resumo = {
            total_valor_recebido: totalValor,
            total_acordos: totalAcordos,
            media_por_acordo: totalAcordos > 0 ? totalValor / totalAcordos : 0
        };

        // Lista de agentes para o filtro do front
        const todosAgentes = await AgentesModel.getAll(false);
        const agentes = todosAgentes.map(a => ({
            id: a.id,
            nome: a.nome
                ? `${a.numero_agente} - ${a.nome}`
                : `${a.numero_agente}`
        }));

        return {
            resumo,
            agentes,
            porBloco
        };
    }

    /**
     * Busca top agentes em valor recebido no período.
     *
     * Estrutura de retorno esperada pelo `ProdutividadeBarChart.jsx`:
     * {
     *   topAgentes: [{ agente_id, agente_nome, media_mensal, total_valor_recebido, total_acordos, media_por_acordo }],
     *   topAgentesPeriodo: [...],
     *   dadosPorMes: [
     *     { date, agente_123: 1000, agente_456: 2000, ... },
     *     ...
     *   ]
     * }
     */
    static async getTopAgentes(limit = 5, startDate = null, endDate = null) {
        const db = await getDB();

        // Datas padrão: últimos 3 meses
        if (!startDate || !endDate) {
            const now = new Date();
            const end = endDate || now.toISOString().split('T')[0];
            const startDateObj = new Date(now);
            startDateObj.setMonth(startDateObj.getMonth() - 2);
            const start = startDate || startDateObj.toISOString().split('T')[0];
            startDate = start;
            endDate = end;
        }

        // 1) Agregação por agente no período inteiro
        const queryResumo = `
            SELECT 
                p.agente AS agente_id,
                COALESCE(a.nome, '') AS agente_nome,
                COALESCE(a.numero_agente, p.agente) AS numero_agente,
                COUNT(*) AS total_acordos,
                COALESCE(SUM(p.valor_recebido), 0) AS total_valor_recebido
            FROM vuon_bordero_pagamento p
            LEFT JOIN agentes a 
                ON a.numero_agente = p.agente
            WHERE 
                p.data_pagamento IS NOT NULL
                AND p.valor_recebido > 0
                AND DATE(p.data_pagamento) >= ?
                AND DATE(p.data_pagamento) <= ?
            GROUP BY p.agente, a.nome, a.numero_agente
            HAVING total_valor_recebido > 0
            ORDER BY total_valor_recebido DESC
            LIMIT ?
        `;

        const [resumoRows] = await db.execute(queryResumo, [startDate, endDate, Number(limit) || 5]);

        if (!resumoRows || resumoRows.length === 0) {
            return {
                topAgentes: [],
                topAgentesPeriodo: [],
                dadosPorMes: []
            };
        }

        // Determinar quantidade de meses distintos no período para média mensal
        const queryMeses = `
            SELECT 
                COUNT(DISTINCT CONCAT(YEAR(data_pagamento), '-', LPAD(MONTH(data_pagamento), 2, '0'))) AS total_meses
            FROM vuon_bordero_pagamento
            WHERE 
                data_pagamento IS NOT NULL
                AND valor_recebido > 0
                AND DATE(data_pagamento) >= ?
                AND DATE(data_pagamento) <= ?
        `;
        const [mesesRows] = await db.execute(queryMeses, [startDate, endDate]);
        const totalMeses = Math.max(1, parseInt(mesesRows[0]?.total_meses || 1, 10));

        // Mapear resumo para o formato esperado
        const topAgentesPeriodo = resumoRows.map(row => {
            const nomeBase = row.agente_nome && row.agente_nome.trim().length > 0
                ? row.agente_nome.trim()
                : String(row.agente_id || row.numero_agente);

            const agenteNome = row.numero_agente
                ? `${row.numero_agente} - ${nomeBase}`
                : nomeBase;

            const totalValor = Number(row.total_valor_recebido || 0);
            const totalAcordos = Number(row.total_acordos || 0);

            return {
                agente_id: Number(row.agente_id),
                agente_nome: agenteNome,
                total_valor_recebido: totalValor,
                total_acordos: totalAcordos,
                media_mensal: totalValor / totalMeses,
                media_por_acordo: totalAcordos > 0 ? totalValor / totalAcordos : 0
            };
        });

        // 2) Dados por mês, só para os top agentes acima
        const idsTop = topAgentesPeriodo.map(a => a.agente_id);
        if (idsTop.length === 0) {
            return {
                topAgentes: [],
                topAgentesPeriodo,
                dadosPorMes: []
            };
        }

        const placeholders = idsTop.map(() => '?').join(',');

        const queryPorMes = `
            SELECT 
                CONCAT(YEAR(p.data_pagamento), '-', LPAD(MONTH(p.data_pagamento), 2, '0')) AS date,
                p.agente AS agente_id,
                COALESCE(SUM(p.valor_recebido), 0) AS total_valor
            FROM vuon_bordero_pagamento p
            WHERE 
                p.data_pagamento IS NOT NULL
                AND p.valor_recebido > 0
                AND DATE(p.data_pagamento) >= ?
                AND DATE(p.data_pagamento) <= ?
                AND p.agente IN (${placeholders})
            GROUP BY 
                YEAR(p.data_pagamento),
                MONTH(p.data_pagamento),
                p.agente
            ORDER BY 
                YEAR(p.data_pagamento) ASC,
                MONTH(p.data_pagamento) ASC
        `;

        const [porMesRows] = await db.execute(queryPorMes, [startDate, endDate, ...idsTop]);

        // Montar estrutura pivotada: um registro por mês com colunas agente_<id>
        const dadosPorMesMap = new Map();

        porMesRows.forEach(row => {
            const date = row.date;
            const agenteId = Number(row.agente_id);
            const key = `agente_${agenteId}`;
            const valor = Number(row.total_valor || 0);

            if (!dadosPorMesMap.has(date)) {
                dadosPorMesMap.set(date, { date });
            }
            const entry = dadosPorMesMap.get(date);
            entry[key] = valor;
        });

        const dadosPorMes = Array.from(dadosPorMesMap.values()).sort((a, b) =>
            a.date.localeCompare(b.date)
        );

        // topAgentes (lista única para o gráfico) – no front usamos agente_id e agente_nome
        const topAgentes = topAgentesPeriodo.map(a => ({
            agente_id: a.agente_id,
            agente_nome: a.agente_nome
        }));

        return {
            topAgentes,
            topAgentesPeriodo,
            dadosPorMes
        };
    }
}

module.exports = ProdutividadeModel;

