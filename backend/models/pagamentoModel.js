const { getDB } = require('../config/db');

class PagamentoModel {
    // Função auxiliar para definir o bloco baseado em dias de atraso
    // Usa atraso_real se disponível, senão usa atraso
    static getBlocoCondition(bloco) {
        // Verificar ambas as colunas: atraso_real primeiro, depois atraso
        switch(bloco) {
            case 1:
                // BLOCO 1: 61 a 90 dias de atraso
                return `((atraso_real >= 61 AND atraso_real <= 90) OR (atraso_real IS NULL AND atraso >= 61 AND atraso <= 90))`;
            case 2:
                // BLOCO 2: 91 a 180 dias de atraso
                return `((atraso_real >= 91 AND atraso_real <= 180) OR (atraso_real IS NULL AND atraso >= 91 AND atraso <= 180))`;
            case 3:
                // BLOCO 3: 181 a 360 dias de atraso
                return `((atraso_real >= 181 AND atraso_real <= 360) OR (atraso_real IS NULL AND atraso >= 181 AND atraso <= 360))`;
            case 'wo':
                // WO: 360 a 9999 dias de atraso
                return `((atraso_real >= 360 AND atraso_real <= 9999) OR (atraso_real IS NULL AND atraso >= 360 AND atraso <= 9999))`;
            default:
                return "1=1"; // Todos os registros
        }
    }

    // Buscar recebimento por bloco agrupado por dia
    static async getRecebimentoPorDia(bloco, startDate = null, endDate = null) {
        const db = await getDB();
        const blocoCondition = this.getBlocoCondition(bloco);
        
        // Usar prepared statements para melhor performance e segurança
        let dateFilter = '';
        const queryParams = [];
        
        if (startDate && endDate) {
            dateFilter = `AND data_pagamento >= ? AND data_pagamento <= ?`;
            queryParams.push(startDate, endDate);
        }

        // Query que agrupa recebimentos por dia
        // OTIMIZADA: usa data_pagamento diretamente no GROUP BY quando possível
        const query = `
            SELECT 
                DATE_FORMAT(data_pagamento, '%Y-%m-%d') as date,
                DATE_FORMAT(data_pagamento, '%d/%m/%Y') as date_formatted,
                COALESCE(SUM(valor_recebido), 0) as valor_recebido,
                COALESCE(SUM(encargos), 0) as encargos,
                COALESCE(SUM(descontos), 0) as descontos,
                COALESCE(SUM(comissao), 0) as comissao,
                COALESCE(SUM(repasse), 0) as repasse,
                COUNT(*) as quantidade_pagamentos
            FROM vuon_bordero_pagamento
            WHERE ${blocoCondition}
                AND data_pagamento IS NOT NULL
                AND valor_recebido > 0
                ${dateFilter}
            GROUP BY DATE(data_pagamento)
            ORDER BY DATE(data_pagamento) ASC
        `;

        const [rows] = queryParams.length > 0 
            ? await db.execute(query, queryParams)
            : await db.execute(query);
        
        return rows.map(row => ({
            date: row.date_formatted || row.date,
            valor_recebido: parseFloat(row.valor_recebido || 0),
            encargos: parseFloat(row.encargos || 0),
            descontos: parseFloat(row.descontos || 0),
            comissao: parseFloat(row.comissao || 0),
            repasse: parseFloat(row.repasse || 0),
            quantidade_pagamentos: parseInt(row.quantidade_pagamentos || 0)
        }));
    }

    // Buscar pagamentos (quantidade) por bloco agrupado por mês ou dia
    static async getPagamentosPorBloco(bloco, startDate = null, endDate = null, groupBy = 'month') {
        const db = await getDB();
        const blocoCondition = this.getBlocoCondition(bloco);
        
        // Usar prepared statements para melhor performance e segurança
        let dateFilter = '';
        const queryParams = [];
        
        if (startDate && endDate) {
            dateFilter = `AND DATE(data_pagamento) >= ? AND DATE(data_pagamento) <= ?`;
            queryParams.push(startDate, endDate);
        }

        let dateSelect, dateFormatted, groupByClause, orderByClause;
        
        if (groupBy === 'day') {
            // Agrupamento por dia
            dateSelect = `DATE(data_pagamento) as date`;
            dateFormatted = `DATE_FORMAT(data_pagamento, '%d/%m/%Y') as date_formatted`;
            groupByClause = `DATE(data_pagamento)`;
            orderByClause = `DATE(data_pagamento) ASC`;
        } else {
            // Agrupamento por mês (usa view otimizada)
            const blocoStr = typeof bloco === 'string' ? bloco : bloco.toString();
            const viewDateFilter = startDate && endDate 
                ? `AND date_key >= '${startDate.substring(0, 7)}' AND date_key <= '${endDate.substring(0, 7)}'`
                : '';
            
            // Para modo mensal, buscar pagamentos APENAS de acordos feitos naquele mês
            // IMPORTANTE: Fazer JOIN com vuon_novacoes para garantir que o pagamento seja de um acordo do mesmo mês
            // Não usar view porque precisa fazer JOIN dinâmico
            const NovacaoModel = require('./novacaoModel');
            const acordosBlocoCondition = NovacaoModel.getBlocoCondition(bloco);
            
            let query, queryParams = [];
            
            // Qualificar atraso_real e atraso com alias da tabela para evitar ambiguidade
            const blocoConditionQualified = blocoCondition.replace(/atraso_real/g, 'p.atraso_real').replace(/\batraso\b/g, 'p.atraso');
            const acordosBlocoConditionQualified = acordosBlocoCondition.replace(/atraso_real/g, 'n.atraso_real');
            
            if (startDate && endDate) {
                query = `
                    SELECT 
                        CONCAT(YEAR(p.data_pagamento), '-', LPAD(MONTH(p.data_pagamento), 2, '0')) as date,
                        CONCAT(LPAD(MONTH(p.data_pagamento), 2, '0'), '/', YEAR(p.data_pagamento)) as date_formatted,
                        COUNT(DISTINCT p.cpf_cnpj) as quantidade_pagamentos
                    FROM vuon_bordero_pagamento p
                    INNER JOIN vuon_novacoes n 
                        ON p.cpf_cnpj = n.cpf_cnpj
                        AND YEAR(p.data_pagamento) = YEAR(n.data_emissao)
                        AND MONTH(p.data_pagamento) = MONTH(n.data_emissao)
                    WHERE 
                        -- Filtros de pagamento
                        p.data_pagamento IS NOT NULL
                        AND p.valor_recebido > 0
                        AND p.parcela = 1
                        AND (${blocoConditionQualified})
                        AND DATE(p.data_pagamento) >= ? 
                        AND DATE(p.data_pagamento) <= ?
                        -- Filtros de acordo
                        AND n.tipo = 'NOV'
                        AND n.atraso_real IS NOT NULL
                        AND (${acordosBlocoConditionQualified})
                    GROUP BY YEAR(p.data_pagamento), MONTH(p.data_pagamento)
                    ORDER BY YEAR(p.data_pagamento) ASC, MONTH(p.data_pagamento) ASC
                `;
                queryParams = [startDate, endDate];
            } else {
                query = `
                    SELECT 
                        CONCAT(YEAR(p.data_pagamento), '-', LPAD(MONTH(p.data_pagamento), 2, '0')) as date,
                        CONCAT(LPAD(MONTH(p.data_pagamento), 2, '0'), '/', YEAR(p.data_pagamento)) as date_formatted,
                        COUNT(DISTINCT p.cpf_cnpj) as quantidade_pagamentos
                    FROM vuon_bordero_pagamento p
                    INNER JOIN vuon_novacoes n 
                        ON p.cpf_cnpj = n.cpf_cnpj
                        AND YEAR(p.data_pagamento) = YEAR(n.data_emissao)
                        AND MONTH(p.data_pagamento) = MONTH(n.data_emissao)
                    WHERE 
                        -- Filtros de pagamento
                        p.data_pagamento IS NOT NULL
                        AND p.valor_recebido > 0
                        AND p.parcela = 1
                        AND (${blocoConditionQualified})
                        -- Filtros de acordo
                        AND n.tipo = 'NOV'
                        AND n.atraso_real IS NOT NULL
                        AND (${acordosBlocoConditionQualified})
                    GROUP BY YEAR(p.data_pagamento), MONTH(p.data_pagamento)
                    ORDER BY YEAR(p.data_pagamento) ASC, MONTH(p.data_pagamento) ASC
                `;
            }
            
            const [rows] = queryParams.length > 0
                ? await db.execute(query, queryParams)
                : await db.execute(query);
            
            return rows.map(row => ({
                date: row.date_formatted || row.date,
                quantidade_pagamentos: parseInt(row.quantidade_pagamentos || 0)
            }));
        }

        // Query direta para agrupamento por dia
        // IMPORTANTE: Contar apenas pagamentos de acordos feitos no mesmo dia
        // Fazer JOIN com vuon_novacoes para garantir correspondência
        const NovacaoModelDay = require('./novacaoModel');
        const acordosBlocoConditionForDay = NovacaoModelDay.getBlocoCondition(bloco);
        
        // Qualificar atraso_real e atraso com alias da tabela para evitar ambiguidade
        const blocoConditionQualified = blocoCondition.replace(/atraso_real/g, 'p.atraso_real').replace(/\batraso\b/g, 'p.atraso');
        const acordosBlocoConditionQualified = acordosBlocoConditionForDay.replace(/atraso_real/g, 'n.atraso_real');
        
        const query = `
            SELECT 
                ${dateSelect},
                ${dateFormatted},
                COUNT(DISTINCT p.cpf_cnpj) as quantidade_pagamentos
            FROM vuon_bordero_pagamento p
            INNER JOIN vuon_novacoes n 
                ON p.cpf_cnpj = n.cpf_cnpj
                ${groupBy === 'day' 
                    ? 'AND DATE(p.data_pagamento) = DATE(n.data_emissao)' 
                    : 'AND YEAR(p.data_pagamento) = YEAR(n.data_emissao) AND MONTH(p.data_pagamento) = MONTH(n.data_emissao)'
                }
            WHERE 
                -- Filtros de pagamento
                p.data_pagamento IS NOT NULL
                AND p.valor_recebido > 0
                AND p.parcela = 1
                AND (${blocoConditionQualified})
                ${dateFilter}
                -- Filtros de acordo
                AND n.tipo = 'NOV'
                AND n.atraso_real IS NOT NULL
                AND (${acordosBlocoConditionQualified})
            GROUP BY ${groupByClause}
            ORDER BY ${orderByClause}
        `;

        const [rows] = queryParams.length > 0 
            ? await db.execute(query, queryParams)
            : await db.execute(query);
        
        return rows.map(row => ({
            date: row.date_formatted || row.date,
            quantidade_pagamentos: parseInt(row.quantidade_pagamentos || 0)
        }));
    }

    // Buscar recebimento por bloco agrupado por mês
    static async getRecebimentoPorBloco(bloco, startDate = null, endDate = null) {
        const db = await getDB();
        const blocoCondition = this.getBlocoCondition(bloco);
        
        // Usar prepared statements para melhor performance e segurança
        let dateFilter = '';
        const queryParams = [];
        
        if (startDate && endDate) {
            dateFilter = `AND data_pagamento >= ? AND data_pagamento <= ?`;
            queryParams.push(startDate, endDate);
        }

        // Query que agrupa recebimentos por mês
        // OTIMIZADA: usa YEAR/MONTH no GROUP BY para usar índice idx_data_pagamento
        const query = `
            SELECT 
                CONCAT(YEAR(data_pagamento), '-', LPAD(MONTH(data_pagamento), 2, '0')) as date,
                CONCAT(LPAD(MONTH(data_pagamento), 2, '0'), '/', YEAR(data_pagamento)) as date_formatted,
                COALESCE(SUM(valor_recebido), 0) as valor_recebido,
                COALESCE(SUM(encargos), 0) as encargos,
                COALESCE(SUM(descontos), 0) as descontos,
                COALESCE(SUM(comissao), 0) as comissao,
                COALESCE(SUM(repasse), 0) as repasse,
                COUNT(*) as quantidade_pagamentos
            FROM vuon_bordero_pagamento
            WHERE ${blocoCondition}
                AND data_pagamento IS NOT NULL
                AND valor_recebido > 0
                ${dateFilter}
            GROUP BY YEAR(data_pagamento), MONTH(data_pagamento)
            ORDER BY YEAR(data_pagamento) ASC, MONTH(data_pagamento) ASC
        `;

        const [rows] = queryParams.length > 0 
            ? await db.execute(query, queryParams)
            : await db.execute(query);
        
        return rows.map(row => ({
            date: row.date_formatted || row.date,
            valor_recebido: parseFloat(row.valor_recebido || 0),
            encargos: parseFloat(row.encargos || 0),
            descontos: parseFloat(row.descontos || 0),
            comissao: parseFloat(row.comissao || 0),
            repasse: parseFloat(row.repasse || 0),
            quantidade_pagamentos: parseInt(row.quantidade_pagamentos || 0)
        }));
    }

    // Total de recebimento por bloco (soma simples)
    static async getTotalRecebimento(bloco, startDate = null, endDate = null) {
        const db = await getDB();
        const blocoCondition = this.getBlocoCondition(bloco);
        
        let dateFilter = '';
        const queryParams = [];
        
        if (startDate && endDate) {
            dateFilter = `AND data_pagamento >= ? AND data_pagamento <= ?`;
            queryParams.push(startDate, endDate);
        }
        
        const query = `
            SELECT 
                COALESCE(SUM(valor_recebido), 0) as total,
                COALESCE(SUM(encargos), 0) as total_encargos,
                COALESCE(SUM(descontos), 0) as total_descontos,
                COALESCE(SUM(comissao), 0) as total_comissao,
                COALESCE(SUM(repasse), 0) as total_repasse,
                COUNT(*) as total_pagamentos
            FROM vuon_bordero_pagamento
            WHERE ${blocoCondition}
                AND data_pagamento IS NOT NULL
                AND valor_recebido > 0
                ${dateFilter}
        `;
        
        const [rows] = queryParams.length > 0 
            ? await db.execute(query, queryParams)
            : await db.execute(query);
        
        return {
            total: parseFloat(rows[0]?.total || 0),
            encargos: parseFloat(rows[0]?.total_encargos || 0),
            descontos: parseFloat(rows[0]?.total_descontos || 0),
            comissao: parseFloat(rows[0]?.total_comissao || 0),
            repasse: parseFloat(rows[0]?.total_repasse || 0),
            quantidade_pagamentos: parseInt(rows[0]?.total_pagamentos || 0)
        };
    }

    // Buscar todos os dados de recebimento por bloco (otimizado)
    static async getRecebimentoData(bloco, startDate = null, endDate = null, groupBy = 'month') {
        const [recebimentoPorPeriodo, total] = await Promise.all([
            groupBy === 'day' 
                ? this.getRecebimentoPorDia(bloco, startDate, endDate)
                : this.getRecebimentoPorBloco(bloco, startDate, endDate),
            this.getTotalRecebimento(bloco, startDate, endDate)
        ]);

        return {
            porMes: groupBy === 'month' ? recebimentoPorPeriodo : [],
            porDia: groupBy === 'day' ? recebimentoPorPeriodo : [],
            total: total.total,
            encargos: total.encargos,
            descontos: total.descontos,
            comissao: total.comissao,
            repasse: total.repasse,
            quantidade_pagamentos: total.quantidade_pagamentos
        };
    }
}

module.exports = PagamentoModel;

