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
    // Ordena por média mensal de valor recebido
    static async getTopAgentesPorPeriodo(startDate = null, endDate = null, limit = 5) {
        const db = await getDB();
        
        let dateFilter = '';
        const queryParams = [];
        
        // Calcular número de meses no período
        let numMeses = 3; // padrão
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            // Calcular diferença em meses de forma mais precisa
            const yearDiff = end.getFullYear() - start.getFullYear();
            const monthDiff = end.getMonth() - start.getMonth();
            numMeses = Math.max(1, yearDiff * 12 + monthDiff + 1); // +1 para incluir ambos os meses
            dateFilter = `AND DATE(data_pagamento) >= ? AND DATE(data_pagamento) <= ?`;
            queryParams.push(startDate, endDate);
        }

        const query = `
            SELECT 
                agente_id,
                agente_nome,
                COALESCE(SUM(valor_recebido), 0) as total_valor_recebido,
                COUNT(*) as total_acordos,
                COALESCE(SUM(valor_recebido) / NULLIF(COUNT(*), 0), 0) as media_por_acordo,
                COALESCE(SUM(valor_recebido), 0) / ? as media_mensal
            FROM recebimentos_por_cobrador
            WHERE data_pagamento IS NOT NULL
                AND valor_recebido IS NOT NULL
                AND agente_id IS NOT NULL
                AND agente_nome IS NOT NULL
                ${dateFilter}
            GROUP BY agente_id, agente_nome
            ORDER BY media_mensal DESC
            LIMIT ?
        `;

        queryParams.unshift(numMeses); // Adicionar numMeses no início
        queryParams.push(limit);

        const [rows] = await db.execute(query, queryParams);
        
        return rows.map(row => ({
            agente_id: parseInt(row.agente_id),
            agente_nome: row.agente_nome,
            total_valor_recebido: parseFloat(row.total_valor_recebido || 0),
            total_acordos: parseInt(row.total_acordos || 0),
            media_por_acordo: parseFloat(row.media_por_acordo || 0),
            media_mensal: parseFloat(row.media_mensal || 0)
        }));
    }

    // Buscar top agentes por mês específico
    static async getTopAgentesPorMes(ano, mes, limit = 5) {
        const db = await getDB();
        
        const query = `
            SELECT 
                agente_id,
                agente_nome,
                COALESCE(SUM(valor_recebido), 0) as valor_recebido,
                COUNT(*) as num_acordos
            FROM recebimentos_por_cobrador
            WHERE data_pagamento IS NOT NULL
                AND valor_recebido IS NOT NULL
                AND agente_id IS NOT NULL
                AND agente_nome IS NOT NULL
                AND YEAR(data_pagamento) = ?
                AND MONTH(data_pagamento) = ?
            GROUP BY agente_id, agente_nome
            ORDER BY valor_recebido DESC
            LIMIT ?
        `;

        console.log(`   🔎 Query para ${mes}/${ano}: YEAR(data_pagamento) = ${ano} AND MONTH(data_pagamento) = ${mes}`);
        
        // Diagnóstico: verificar se há dados de dezembro na tabela
        if (mes === 12 && ano === 2025) {
            try {
                const [diagnostico] = await db.execute(`
                    SELECT 
                        COUNT(*) as total_registros,
                        COUNT(DISTINCT DATE(data_pagamento)) as dias_com_pagamento,
                        MIN(data_pagamento) as primeira_data,
                        MAX(data_pagamento) as ultima_data,
                        COUNT(CASE WHEN data_pagamento IS NOT NULL THEN 1 END) as com_data_pagamento,
                        COUNT(CASE WHEN valor_recebido IS NOT NULL THEN 1 END) as com_valor,
                        COUNT(CASE WHEN agente_id IS NOT NULL THEN 1 END) as com_agente_id
                    FROM recebimentos_por_cobrador
                    WHERE YEAR(data_pagamento) = ? OR YEAR(data_vencimento) = ? OR YEAR(data_importacao) = ?
                `, [ano, ano, ano]);
                
                console.log(`   🔍 Diagnóstico Dezembro 2025:`, diagnostico[0]);
                
                // Verificar datas específicas
                const [datas] = await db.execute(`
                    SELECT DISTINCT DATE(data_pagamento) as data, COUNT(*) as total
                    FROM recebimentos_por_cobrador
                    WHERE data_pagamento IS NOT NULL
                        AND (YEAR(data_pagamento) = ? OR MONTH(data_pagamento) = ?)
                    GROUP BY DATE(data_pagamento)
                    ORDER BY data DESC
                    LIMIT 10
                `, [ano, mes]);
                
                console.log(`   📅 Últimas 10 datas encontradas:`, datas.map(d => `${d.data} (${d.total} registros)`).join(', '));
            } catch (err) {
                console.log(`   ⚠️ Erro no diagnóstico:`, err.message);
            }
        }
        
        const [rows] = await db.execute(query, [ano, mes, limit]);
        
        console.log(`   📈 Query retornou ${rows.length} registros para ${mes}/${ano}`);
        if (rows.length > 0) {
            console.log(`   📋 Primeiros agentes: ${rows.slice(0, 3).map(r => `${r.agente_nome} (R$ ${parseFloat(r.valor_recebido || 0).toFixed(2)})`).join(', ')}`);
        }
        
        return rows.map(row => ({
            agente_id: parseInt(row.agente_id),
            agente_nome: row.agente_nome,
            valor_recebido: parseFloat(row.valor_recebido || 0),
            num_acordos: parseInt(row.num_acordos || 0)
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

