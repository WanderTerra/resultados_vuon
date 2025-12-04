const { getDB } = require('../config/db');

class RecebimentoCobradorModel {
    // Função auxiliar para definir o bloco baseado em dias de atraso_real
    static getBlocoCondition(bloco) {
        switch(bloco) {
            case 1:
                // BLOCO 1: 61 a 90 dias de atraso
                return `atraso_real >= 61 AND atraso_real <= 90`;
            case 2:
                // BLOCO 2: 91 a 180 dias de atraso
                return `atraso_real >= 91 AND atraso_real <= 180`;
            case 3:
                // BLOCO 3: 181 a 360 dias de atraso
                return `atraso_real >= 181 AND atraso_real <= 360`;
            case 'wo':
                // WO: 360 ou mais dias de atraso
                return `atraso_real >= 360`;
            default:
                return "1=1"; // Todos os registros
        }
    }

    // Buscar produtividade por dia
    static async getProdutividadePorDia(agenteId = null, startDate = null, endDate = null) {
        const db = await getDB();
        
        let dateFilter = '';
        let agenteFilter = '';
        const queryParams = [];
        
        if (startDate && endDate) {
            dateFilter = `AND DATE(data_pagamento) >= ? AND DATE(data_pagamento) <= ?`;
            queryParams.push(startDate, endDate);
        }
        
        if (agenteId) {
            agenteFilter = `AND agente_id = ?`;
            queryParams.push(agenteId);
        }

        const query = `
            SELECT 
                DATE_FORMAT(data_pagamento, '%Y-%m-%d') as date,
                DATE_FORMAT(data_pagamento, '%d/%m/%Y') as date_formatted,
                COALESCE(SUM(valor_recebido), 0) as valor_recebido,
                COUNT(*) as num_acordos
            FROM recebimentos_por_cobrador
            WHERE data_pagamento IS NOT NULL
                AND valor_recebido IS NOT NULL
                ${dateFilter}
                ${agenteFilter}
            GROUP BY DATE(data_pagamento)
            ORDER BY DATE(data_pagamento) ASC
        `;

        const [rows] = queryParams.length > 0 
            ? await db.execute(query, queryParams)
            : await db.execute(query);
        
        return rows.map(row => ({
            date: row.date_formatted || row.date,
            valor_recebido: parseFloat(row.valor_recebido || 0),
            num_acordos: parseInt(row.num_acordos || 0)
        }));
    }

    // Buscar produtividade por mês
    static async getProdutividadePorMes(agenteId = null, startDate = null, endDate = null) {
        const db = await getDB();
        
        let dateFilter = '';
        let agenteFilter = '';
        const queryParams = [];
        
        if (startDate && endDate) {
            dateFilter = `AND DATE(data_pagamento) >= ? AND DATE(data_pagamento) <= ?`;
            queryParams.push(startDate, endDate);
        }
        
        if (agenteId) {
            agenteFilter = `AND agente_id = ?`;
            queryParams.push(agenteId);
        }

        const query = `
            SELECT 
                CONCAT(YEAR(data_pagamento), '-', LPAD(MONTH(data_pagamento), 2, '0')) as date,
                CONCAT(LPAD(MONTH(data_pagamento), 2, '0'), '/', YEAR(data_pagamento)) as date_formatted,
                COALESCE(SUM(valor_recebido), 0) as valor_recebido,
                COUNT(*) as num_acordos
            FROM recebimentos_por_cobrador
            WHERE data_pagamento IS NOT NULL
                AND valor_recebido IS NOT NULL
                ${dateFilter}
                ${agenteFilter}
            GROUP BY YEAR(data_pagamento), MONTH(data_pagamento)
            ORDER BY YEAR(data_pagamento) ASC, MONTH(data_pagamento) ASC
        `;

        const [rows] = queryParams.length > 0 
            ? await db.execute(query, queryParams)
            : await db.execute(query);
        
        return rows.map(row => ({
            date: row.date_formatted || row.date,
            valor_recebido: parseFloat(row.valor_recebido || 0),
            num_acordos: parseInt(row.num_acordos || 0)
        }));
    }

    // Buscar produtividade por bloco agrupado por dia ou mês
    static async getProdutividadePorBloco(bloco, agenteId = null, startDate = null, endDate = null, groupBy = 'month') {
        const db = await getDB();
        const blocoCondition = this.getBlocoCondition(bloco);
        
        let dateFilter = '';
        let agenteFilter = '';
        const queryParams = [];
        
        if (startDate && endDate) {
            dateFilter = `AND DATE(data_pagamento) >= ? AND DATE(data_pagamento) <= ?`;
            queryParams.push(startDate, endDate);
        }
        
        if (agenteId) {
            agenteFilter = `AND agente_id = ?`;
            queryParams.push(agenteId);
        }

        let dateSelect, dateFormatted, groupByClause, orderByClause;
        
        if (groupBy === 'day') {
            dateSelect = `DATE_FORMAT(data_pagamento, '%Y-%m-%d') as date`;
            dateFormatted = `DATE_FORMAT(data_pagamento, '%d/%m/%Y') as date_formatted`;
            groupByClause = `DATE(data_pagamento)`;
            orderByClause = `DATE(data_pagamento) ASC`;
        } else {
            dateSelect = `CONCAT(YEAR(data_pagamento), '-', LPAD(MONTH(data_pagamento), 2, '0')) as date`;
            dateFormatted = `CONCAT(LPAD(MONTH(data_pagamento), 2, '0'), '/', YEAR(data_pagamento)) as date_formatted`;
            groupByClause = `YEAR(data_pagamento), MONTH(data_pagamento)`;
            orderByClause = `YEAR(data_pagamento) ASC, MONTH(data_pagamento) ASC`;
        }

        const query = `
            SELECT 
                ${dateSelect},
                ${dateFormatted},
                COALESCE(SUM(valor_recebido), 0) as valor_recebido,
                COUNT(*) as num_acordos
            FROM recebimentos_por_cobrador
            WHERE ${blocoCondition}
                AND data_pagamento IS NOT NULL
                AND valor_recebido IS NOT NULL
                AND atraso_real IS NOT NULL
                ${dateFilter}
                ${agenteFilter}
            GROUP BY ${groupByClause}
            ORDER BY ${orderByClause}
        `;

        const [rows] = queryParams.length > 0 
            ? await db.execute(query, queryParams)
            : await db.execute(query);
        
        return rows.map(row => ({
            date: row.date_formatted || row.date,
            valor_recebido: parseFloat(row.valor_recebido || 0),
            num_acordos: parseInt(row.num_acordos || 0)
        }));
    }

    // Listar todos os agentes disponíveis
    static async getAgentesList() {
        const db = await getDB();
        
        const query = `
            SELECT DISTINCT 
                agente_id as id,
                agente_nome as nome
            FROM recebimentos_por_cobrador
            WHERE agente_id IS NOT NULL
                AND agente_nome IS NOT NULL
            ORDER BY agente_nome ASC
        `;

        const [rows] = await db.execute(query);
        
        return rows.map(row => ({
            id: parseInt(row.id),
            nome: row.nome
        }));
    }

    // Buscar resumo de produtividade (métricas agregadas)
    static async getResumoProdutividade(agenteId = null, startDate = null, endDate = null) {
        const db = await getDB();
        
        let dateFilter = '';
        let agenteFilter = '';
        const queryParams = [];
        
        if (startDate && endDate) {
            dateFilter = `AND DATE(data_pagamento) >= ? AND DATE(data_pagamento) <= ?`;
            queryParams.push(startDate, endDate);
        }
        
        if (agenteId) {
            agenteFilter = `AND agente_id = ?`;
            queryParams.push(agenteId);
        }

        const query = `
            SELECT 
                COALESCE(SUM(valor_recebido), 0) as total_valor_recebido,
                COUNT(*) as total_acordos
            FROM recebimentos_por_cobrador
            WHERE data_pagamento IS NOT NULL
                AND valor_recebido IS NOT NULL
                ${dateFilter}
                ${agenteFilter}
        `;

        const [rows] = queryParams.length > 0 
            ? await db.execute(query, queryParams)
            : await db.execute(query);
        
        const totalValor = parseFloat(rows[0]?.total_valor_recebido || 0);
        const totalAcordos = parseInt(rows[0]?.total_acordos || 0);
        const mediaPorAcordo = totalAcordos > 0 ? totalValor / totalAcordos : 0;

        return {
            total_valor_recebido: totalValor,
            total_acordos: totalAcordos,
            media_por_acordo: mediaPorAcordo
        };
    }

    // Buscar top agentes por período (últimos N meses)
    static async getTopAgentesPorPeriodo(startDate = null, endDate = null, limit = 5) {
        const db = await getDB();
        
        let dateFilter = '';
        const queryParams = [];
        
        if (startDate && endDate) {
            dateFilter = `AND DATE(data_pagamento) >= ? AND DATE(data_pagamento) <= ?`;
            queryParams.push(startDate, endDate);
        }

        const query = `
            SELECT 
                agente_id,
                agente_nome,
                COALESCE(SUM(valor_recebido), 0) as total_valor_recebido,
                COUNT(*) as total_acordos,
                COALESCE(SUM(valor_recebido) / NULLIF(COUNT(*), 0), 0) as media_por_acordo
            FROM recebimentos_por_cobrador
            WHERE data_pagamento IS NOT NULL
                AND valor_recebido IS NOT NULL
                AND agente_id IS NOT NULL
                AND agente_nome IS NOT NULL
                ${dateFilter}
            GROUP BY agente_id, agente_nome
            ORDER BY total_valor_recebido DESC
            LIMIT ?
        `;

        queryParams.push(limit);

        const [rows] = await db.execute(query, queryParams);
        
        return rows.map(row => ({
            agente_id: parseInt(row.agente_id),
            agente_nome: row.agente_nome,
            total_valor_recebido: parseFloat(row.total_valor_recebido || 0),
            total_acordos: parseInt(row.total_acordos || 0),
            media_por_acordo: parseFloat(row.media_por_acordo || 0)
        }));
    }

    // Buscar produtividade por agente e mês (para gráfico de barras comparativo)
    static async getProdutividadeAgentesPorMes(agenteIds = [], startDate = null, endDate = null) {
        const db = await getDB();
        
        let dateFilter = '';
        let agenteFilter = '';
        const queryParams = [];
        
        if (startDate && endDate) {
            dateFilter = `AND DATE(data_pagamento) >= ? AND DATE(data_pagamento) <= ?`;
            queryParams.push(startDate, endDate);
        }
        
        if (agenteIds && agenteIds.length > 0) {
            const placeholders = agenteIds.map(() => '?').join(',');
            agenteFilter = `AND agente_id IN (${placeholders})`;
            queryParams.push(...agenteIds);
        }

        const query = `
            SELECT 
                agente_id,
                agente_nome,
                CONCAT(YEAR(data_pagamento), '-', LPAD(MONTH(data_pagamento), 2, '0')) as date,
                CONCAT(LPAD(MONTH(data_pagamento), 2, '0'), '/', YEAR(data_pagamento)) as date_formatted,
                COALESCE(SUM(valor_recebido), 0) as valor_recebido,
                COUNT(*) as num_acordos
            FROM recebimentos_por_cobrador
            WHERE data_pagamento IS NOT NULL
                AND valor_recebido IS NOT NULL
                AND agente_id IS NOT NULL
                AND agente_nome IS NOT NULL
                ${dateFilter}
                ${agenteFilter}
            GROUP BY agente_id, agente_nome, YEAR(data_pagamento), MONTH(data_pagamento)
            ORDER BY agente_nome ASC, YEAR(data_pagamento) ASC, MONTH(data_pagamento) ASC
        `;

        const [rows] = queryParams.length > 0 
            ? await db.execute(query, queryParams)
            : await db.execute(query);
        
        return rows.map(row => ({
            agente_id: parseInt(row.agente_id),
            agente_nome: row.agente_nome,
            date: row.date_formatted || row.date,
            valor_recebido: parseFloat(row.valor_recebido || 0),
            num_acordos: parseInt(row.num_acordos || 0)
        }));
    }

    // Buscar dados completos de produtividade (resumo + por bloco)
    static async getProdutividadeData(agenteId = null, startDate = null, endDate = null, groupBy = 'month') {
        const [resumo, bloco1, bloco2, bloco3, wo, agentes] = await Promise.all([
            this.getResumoProdutividade(agenteId, startDate, endDate),
            this.getProdutividadePorBloco(1, agenteId, startDate, endDate, groupBy),
            this.getProdutividadePorBloco(2, agenteId, startDate, endDate, groupBy),
            this.getProdutividadePorBloco(3, agenteId, startDate, endDate, groupBy),
            this.getProdutividadePorBloco('wo', agenteId, startDate, endDate, groupBy),
            this.getAgentesList()
        ]);

        return {
            resumo,
            porBloco: {
                bloco1,
                bloco2,
                bloco3,
                wo
            },
            agentes
        };
    }
}

module.exports = RecebimentoCobradorModel;

