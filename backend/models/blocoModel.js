const { getDB } = require('../config/db');
const NovacaoModel = require('./novacaoModel');
const PagamentoModel = require('./pagamentoModel');

class BlocoModel {
    // Função auxiliar para definir o bloco baseado em dias de atraso
    static getBlocoCondition(bloco) {
        switch(bloco) {
            case 1:
                // BLOCO 1: 61 a 90 dias de atraso
                return "atraso >= 61 AND atraso <= 90";
            case 2:
                // BLOCO 2: 91 a 180 dias de atraso
                return "atraso >= 91 AND atraso <= 180";
            case 3:
                // BLOCO 3: 181 a 360 dias de atraso
                return "atraso >= 181 AND atraso <= 360";
            case 'wo':
                // WO: 360 a 9999 dias de atraso
                return "atraso >= 360 AND atraso <= 9999";
            default:
                return "1=1"; // Todos os registros
        }
    }

    // Acionados x Carteira por data
    // Carteira = total de registros naquela data (não clientes únicos)
    static async getAcionadosXCarteira(bloco, startDate = null, endDate = null) {
        const db = await getDB();
        const blocoCondition = this.getBlocoCondition(bloco);
        
        let dateFilter = '';
        if (startDate && endDate) {
            dateFilter = `AND data >= '${startDate}' AND data <= '${endDate}'`;
        }
        
        const query = `
            SELECT 
                data as date,
                COUNT(*) as carteira,
                COUNT(CASE WHEN acao IS NOT NULL AND acao != '' THEN 1 END) as acionados,
                ROUND(
                    COUNT(CASE WHEN acao IS NOT NULL AND acao != '' THEN 1 END) * 100.0 / 
                    NULLIF(COUNT(*), 0), 
                    2
                ) as percent
            FROM vuon_resultados
            WHERE ${blocoCondition}
                ${dateFilter}
            GROUP BY data
            ORDER BY data ASC
        `;
        const [rows] = await db.execute(query);
        return rows;
    }

    // Acionados x Alô por data
    static async getAcionadosXAlo(bloco, startDate = null, endDate = null) {
        const db = await getDB();
        const blocoCondition = this.getBlocoCondition(bloco);
        
        let dateFilter = '';
        if (startDate && endDate) {
            dateFilter = `AND data >= '${startDate}' AND data <= '${endDate}'`;
        }
        
        const query = `
            SELECT 
                data as date,
                COUNT(CASE WHEN acao IS NOT NULL AND acao != '' THEN 1 END) as acionados,
                COUNT(CASE 
                    WHEN agente != '0' AND agente IS NOT NULL AND agente != '' 
                    THEN 1 
                END) as alo,
                ROUND(
                    COUNT(CASE 
                        WHEN agente != '0' AND agente IS NOT NULL AND agente != '' 
                        THEN 1 
                    END) * 100.0 / 
                    NULLIF(COUNT(CASE WHEN acao IS NOT NULL AND acao != '' THEN 1 END), 0), 
                    2
                ) as percent
            FROM vuon_resultados
            WHERE ${blocoCondition}
                ${dateFilter}
            GROUP BY data
            ORDER BY data ASC
        `;
        const [rows] = await db.execute(query);
        return rows;
    }

    // Alô x CPC por data
    // CPC: Todas as ações com agente (EIO, CSA, ACD, SCP, APH, DEF, SRP, APC, JUR, DDA)
    static async getAloXCpc(bloco, startDate = null, endDate = null) {
        const db = await getDB();
        const blocoCondition = this.getBlocoCondition(bloco);
        
        let dateFilter = '';
        if (startDate && endDate) {
            dateFilter = `AND data >= '${startDate}' AND data <= '${endDate}'`;
        }
        
        const query = `
            SELECT 
                data as date,
                COUNT(CASE 
                    WHEN agente != '0' AND agente IS NOT NULL AND agente != '' 
                    THEN 1 
                END) as alo,
                COUNT(CASE 
                    WHEN agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                        AND acao IN ('EIO', 'CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'APC', 'JUR', 'DDA')
                    THEN 1 
                END) as cpc,
                ROUND(
                    COUNT(CASE 
                        WHEN agente != '0' 
                            AND agente IS NOT NULL 
                            AND agente != ''
                            AND acao IN ('EIO', 'CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'APC', 'JUR', 'DDA')
                        THEN 1 
                    END) * 100.0 / 
                    NULLIF(COUNT(CASE 
                        WHEN agente != '0' AND agente IS NOT NULL AND agente != '' 
                        THEN 1 
                    END), 0), 
                    2
                ) as percent
            FROM vuon_resultados
            WHERE ${blocoCondition}
                ${dateFilter}
            GROUP BY data
            ORDER BY data ASC
        `;
        const [rows] = await db.execute(query);
        return rows;
    }

    // CPC x CPCA por data
    // CPC: Todas as ações (EIO, CSA, ACD, SCP, APH, DEF, SRP, APC, JUR, DDA)
    // CPCA: Ações CPCA (CSA, ACD, SCP, APH, DEF, SRP, JUR, DDA) - exclui EIO e APC
    static async getCpcXCpca(bloco, startDate = null, endDate = null) {
        const db = await getDB();
        const blocoCondition = this.getBlocoCondition(bloco);
        
        let dateFilter = '';
        if (startDate && endDate) {
            dateFilter = `AND data >= '${startDate}' AND data <= '${endDate}'`;
        }
        
        const query = `
            SELECT 
                data as date,
                COUNT(CASE 
                    WHEN agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                        AND acao IN ('EIO', 'CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'APC', 'JUR', 'DDA')
                    THEN 1 
                END) as cpc,
                COUNT(CASE 
                    WHEN agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                        AND acao IN ('CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'JUR', 'DDA')
                    THEN 1 
                END) as cpca,
                ROUND(
                    COUNT(CASE 
                        WHEN agente != '0' 
                            AND agente IS NOT NULL 
                            AND agente != ''
                            AND acao IN ('CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'JUR', 'DDA')
                        THEN 1 
                    END) * 100.0 / 
                    NULLIF(COUNT(CASE 
                        WHEN agente != '0' 
                            AND agente IS NOT NULL 
                            AND agente != ''
                            AND acao IN ('EIO', 'CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'APC', 'JUR', 'DDA')
                        THEN 1 
                    END), 0), 
                    2
                ) as percent
            FROM vuon_resultados
            WHERE ${blocoCondition}
                ${dateFilter}
            GROUP BY data
            ORDER BY data ASC
        `;
        const [rows] = await db.execute(query);
        return rows;
    }

    // CPCA x Acordos por data
    // CPCA: Ações CPCA (CSA, ACD, SCP, APH, DEF, SRP, JUR, DDA)
    // Acordos: Ação ACD (ACORDO)
    static async getCpcaXAcordos(bloco, startDate = null, endDate = null) {
        const db = await getDB();
        const blocoCondition = this.getBlocoCondition(bloco);
        
        let dateFilter = '';
        if (startDate && endDate) {
            dateFilter = `AND data >= '${startDate}' AND data <= '${endDate}'`;
        }
        
        const query = `
            SELECT 
                data as date,
                COUNT(CASE 
                    WHEN agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                        AND acao IN ('CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'JUR', 'DDA')
                    THEN 1 
                END) as cpca,
                COUNT(CASE 
                    WHEN agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                        AND acao = 'DDA'
                    THEN 1 
                END) as acordos,
                ROUND(
                    COUNT(CASE 
                        WHEN agente != '0' 
                            AND agente IS NOT NULL 
                            AND agente != ''
                            AND acao = 'DDA'
                        THEN 1 
                    END) * 100.0 / 
                    NULLIF(COUNT(CASE 
                        WHEN agente != '0' 
                            AND agente IS NOT NULL 
                            AND agente != ''
                            AND acao IN ('CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'JUR', 'DDA')
                        THEN 1 
                    END), 0), 
                    2
                ) as percent
            FROM vuon_resultados
            WHERE ${blocoCondition}
                ${dateFilter}
            GROUP BY data
            ORDER BY data ASC
        `;
        const [rows] = await db.execute(query);
        return rows;
    }

    // Acordos x Pagamentos por data
    // Acordos: ação 'DDA' da tabela vuon_resultados
    // Pagamentos: registros com valor > 0 da tabela vuon_resultados
    static async getAcordosXPagamentos(bloco, startDate = null, endDate = null) {
        const db = await getDB();
        const blocoCondition = this.getBlocoCondition(bloco);
        
        let dateFilter = '';
        if (startDate && endDate) {
            dateFilter = `AND data >= '${startDate}' AND data <= '${endDate}'`;
        }
        const query = `
            SELECT 
                data as date,
                COUNT(CASE 
                    WHEN agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                        AND acao IN ('DDA')
                    THEN 1 
                END) as acordos,
                COUNT(CASE 
                    WHEN agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                        AND valor > 0
                    THEN 1 
                END) as pgto,
                ROUND(
                    COUNT(CASE 
                        WHEN agente != '0' 
                            AND agente IS NOT NULL 
                            AND agente != ''
                            AND valor > 0
                        THEN 1 
                    END) * 100.0 / 
                    NULLIF(COUNT(CASE 
                        WHEN agente != '0' 
                            AND agente IS NOT NULL 
                            AND agente != ''
                            AND acao IN ('DDA')
                        THEN 1 
                    END), 0), 
                    2
                ) as percent
            FROM vuon_resultados
            WHERE ${blocoCondition}
                ${dateFilter}
            GROUP BY data
            ORDER BY data ASC
        `;
        const [rows] = await db.execute(query);
        return rows;
    }

    // Total de spins por bloco (total de registros únicos por cliente)
    static async getSpins(bloco) {
        const db = await getDB();
        const blocoCondition = this.getBlocoCondition(bloco);
        
        const query = `
            SELECT COUNT(DISTINCT codigo) as spins
            FROM vuon_resultados
            WHERE ${blocoCondition}
        `;
        const [rows] = await db.execute(query);
        return rows[0]?.spins || 0;
    }

    // Recebimento financeiro por bloco
    static async getRecebimento(bloco, startDate = null, endDate = null) {
        const db = await getDB();
        const blocoCondition = this.getBlocoCondition(bloco);
        
        let dateFilter = '';
        if (startDate && endDate) {
            dateFilter = `AND data >= '${startDate}' AND data <= '${endDate}'`;
        }
        
        const query = `
            SELECT COALESCE(SUM(valor), 0) as total
            FROM vuon_resultados
            WHERE ${blocoCondition}
                AND valor > 0
                ${dateFilter}
        `;
        const [rows] = await db.execute(query);
        return parseFloat(rows[0]?.total || 0);
    }

    // Buscar todos os dados de um bloco - OTIMIZADO: usa views pré-computadas
    static async getBlocoData(bloco, startDate = null, endDate = null, groupBy = 'month') {
        const db = await getDB();
        
        // Determinar nome da view baseado no bloco
        const blocoName = bloco === 'wo' ? 'wo' : String(bloco);
        const viewName = `v_bloco${blocoName}_agregado`;
        
        // Verificar se a view existe, caso contrário usar queries diretas
        let useViews = true;
        try {
            await db.execute(`SELECT 1 FROM ${viewName} LIMIT 1`);
        } catch (error) {
            // Se a view não existe, usar queries diretas (fallback)
            console.warn(`⚠️  View ${viewName} não encontrada. Usando queries diretas. Execute: npm run create-blocos-views`);
            useViews = false;
        }
        
        // Se views não estão disponíveis, usar método antigo
        if (!useViews) {
            const blocoCondition = this.getBlocoCondition(bloco);
            
            let dateFilter = '';
            const queryParams = [];
            
            if (startDate && endDate) {
                dateFilter = `AND data >= ? AND data <= ?`;
                queryParams.push(startDate, endDate);
            }

            let dateSelect, dateFormatted, groupByClause, orderByClause;
            
            if (groupBy === 'day') {
                dateSelect = `DATE(data) as date`;
                dateFormatted = `DATE_FORMAT(data, '%d/%m/%Y') as date_formatted`;
                groupByClause = `DATE(data)`;
                orderByClause = `DATE(data) ASC`;
            } else {
                dateSelect = `CONCAT(YEAR(data), '-', LPAD(MONTH(data), 2, '0')) as date`;
                dateFormatted = `CONCAT(LPAD(MONTH(data), 2, '0'), '/', YEAR(data)) as date_formatted`;
                groupByClause = `YEAR(data), MONTH(data)`;
                orderByClause = `YEAR(data) ASC, MONTH(data) ASC`;
            }

            const query = `
                SELECT 
                    ${dateSelect},
                    ${dateFormatted},
                    COUNT(*) as carteira,
                    SUM(acao IS NOT NULL AND acao != '') as acionados,
                    SUM(agente != '0' AND agente IS NOT NULL AND agente != '') as alo,
                    SUM(
                        agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                        AND acao IN ('EIO', 'CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'APC', 'JUR', 'DDA')
                    ) as cpc,
                    SUM(
                        agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                        AND acao IN ('CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'JUR', 'DDA')
                    ) as cpca,
                    SUM(
                        agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                        AND acao IN ('DDA')
                    ) as acordos_resultados,
                    SUM(
                        agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                        AND valor > 0
                    ) as pgto_resultados
                FROM vuon_resultados
                WHERE ${blocoCondition}
                    ${dateFilter}
                GROUP BY ${groupByClause}
                ORDER BY ${orderByClause}
            `;

            const [rows] = queryParams.length > 0 
                ? await db.execute(query, queryParams)
                : await db.execute(query);
            
            // Processar dados (mesmo código de processamento abaixo)
            const acionadosXCarteira = rows.map(row => ({
                date: row.date_formatted || row.date,
                carteira: row.carteira,
                acionados: row.acionados,
                percent: row.carteira > 0 ? parseFloat((row.acionados * 100.0 / row.carteira).toFixed(2)) : 0
            }));

            const acionadosXAlo = rows.map(row => ({
                date: row.date_formatted || row.date,
                acionados: row.acionados,
                alo: row.alo,
                percent: row.acionados > 0 ? parseFloat((row.alo * 100.0 / row.acionados).toFixed(2)) : 0
            }));

            const aloXCpc = rows.map(row => ({
                date: row.date_formatted || row.date,
                alo: row.alo,
                cpc: row.cpc,
                percent: row.alo > 0 ? parseFloat((row.cpc * 100.0 / row.alo).toFixed(2)) : 0
            }));

            const cpcXCpca = rows.map(row => ({
                date: row.date_formatted || row.date,
                cpc: row.cpc,
                cpca: row.cpca,
                percent: row.cpc > 0 ? parseFloat((row.cpca * 100.0 / row.cpc).toFixed(2)) : 0
            }));

            const [acordosNovacoes, pagamentosBordero] = await Promise.all([
                NovacaoModel.getAcordosPorBloco(bloco, startDate, endDate, groupBy),
                PagamentoModel.getPagamentosPorBloco(bloco, startDate, endDate, groupBy)
            ]);
            
            const acordosMap = new Map();
            acordosNovacoes.forEach(item => {
                acordosMap.set(item.date, item.total_acordos);
            });

            const pagamentosMap = new Map();
            pagamentosBordero.forEach(item => {
                pagamentosMap.set(item.date, item.quantidade_pagamentos || 0);
            });

            const cpcaXAcordos = rows.map(row => {
                const dateKey = row.date_formatted || row.date;
                const acordos = acordosMap.get(dateKey) || 0;
                return {
                    date: dateKey,
                    cpca: row.cpca,
                    acordos: acordos,
                    percent: row.cpca > 0 ? parseFloat((acordos * 100.0 / row.cpca).toFixed(2)) : 0
                };
            });

            const acordosXPagamentos = rows.map(row => {
                const dateKey = row.date_formatted || row.date;
                const acordos = acordosMap.get(dateKey) || 0;
                const pagamentos = pagamentosMap.get(dateKey) || 0;
                return {
                    date: dateKey,
                    acordos: acordos,
                    pgto: pagamentos,
                    percent: acordos > 0 ? parseFloat((pagamentos * 100.0 / acordos).toFixed(2)) : 0
                };
            });

            const [spins, recebimento] = await Promise.all([
                this.getSpins(bloco),
                this.getRecebimento(bloco, startDate, endDate)
            ]);

            return {
                spins,
                recebimento,
                acionadosXCarteira,
                acionadosXAlo,
                aloXCpc,
                cpcXCpca,
                cpcaXAcordos,
                acordosXPagamentos
            };
        }
        
        // Usar prepared statements para melhor performance e segurança
        let dateFilter = '';
        const queryParams = [];
        
        if (startDate && endDate) {
            // IMPORTANTE: Sempre filtrar pela coluna 'data' da view (que é DATE)
            // Mesmo quando agrupamos por mês, precisamos filtrar pela data original
            dateFilter = `AND data >= ? AND data <= ?`;
            queryParams.push(startDate, endDate);
            console.log(`📊 Bloco ${bloco} - Aplicando filtro: ${startDate} até ${endDate}, groupBy: ${groupBy}`);
        }

        // Determinar agrupamento: por dia ou por mês
        let dateSelect, dateFormatted, groupByClause, orderByClause;
        
        if (groupBy === 'day') {
            // Agrupamento por dia - usar data diretamente da view
            dateSelect = `data as date`;
            dateFormatted = `DATE_FORMAT(data, '%d/%m/%Y') as date_formatted`;
            groupByClause = `data`;
            orderByClause = `data ASC`;
        } else {
            // Agrupamento por mês (padrão) - usar campos pré-computados da view
            // IMPORTANTE: Filtrar pela coluna 'data' mas agrupar por 'ano, mes'
            dateSelect = `date_month as date`;
            dateFormatted = `date_formatted`;
            groupByClause = `ano, mes, date_month, date_formatted`;
            orderByClause = `ano ASC, mes ASC`;
        }

        // Query otimizada usando view pré-computada
        // A view já tem todos os cálculos feitos, apenas filtramos e agrupamos
        const query = `
            SELECT 
                ${dateSelect},
                ${dateFormatted},
                -- Acionados x Carteira
                SUM(carteira) as carteira,
                SUM(acionados) as acionados,
                -- Acionados x Alô
                SUM(alo) as alo,
                -- Alô x CPC
                SUM(cpc) as cpc,
                -- CPC x CPCA
                SUM(cpca) as cpca,
                -- CPCA x Acordos (será combinado com dados de novacoes)
                SUM(acordos_resultados) as acordos_resultados,
                -- Acordos x Pagamentos (será combinado com dados de pagamentos)
                SUM(pgto_resultados) as pgto_resultados,
                -- Spins (média ponderada ou soma, dependendo da necessidade)
                MAX(spins) as spins,
                -- Recebimento
                SUM(recebimento) as recebimento
            FROM ${viewName}
            WHERE 1=1
                ${dateFilter}
            GROUP BY ${groupByClause}
            ORDER BY ${orderByClause}
        `;

        const [rows] = queryParams.length > 0 
            ? await db.execute(query, queryParams)
            : await db.execute(query);
        
        console.log(`📊 Bloco ${bloco} - Total de registros retornados: ${rows.length}`);
        if (rows.length > 0) {
            console.log(`📊 Primeiros meses: ${rows.slice(0, 3).map(r => r.date_formatted || r.date).join(', ')}`);
        }
        
        // Processar os dados para criar os arrays de cada gráfico
        // Usar date_formatted para exibição
        const acionadosXCarteira = rows.map(row => ({
            date: row.date_formatted || row.date,
            carteira: row.carteira,
            acionados: row.acionados,
            percent: row.carteira > 0 ? parseFloat((row.acionados * 100.0 / row.carteira).toFixed(2)) : 0
        }));

        const acionadosXAlo = rows.map(row => ({
            date: row.date_formatted || row.date,
            acionados: row.acionados,
            alo: row.alo,
            percent: row.acionados > 0 ? parseFloat((row.alo * 100.0 / row.acionados).toFixed(2)) : 0
        }));

        const aloXCpc = rows.map(row => ({
            date: row.date_formatted || row.date,
            alo: row.alo,
            cpc: row.cpc,
            percent: row.alo > 0 ? parseFloat((row.cpc * 100.0 / row.alo).toFixed(2)) : 0
        }));

        const cpcXCpca = rows.map(row => ({
            date: row.date_formatted || row.date,
            cpc: row.cpc,
            cpca: row.cpca,
            percent: row.cpc > 0 ? parseFloat((row.cpca * 100.0 / row.cpc).toFixed(2)) : 0
        }));

        // OTIMIZAÇÃO: Buscar acordos e pagamentos usando views pré-computadas
        const acordosViewName = `v_bloco${blocoName}_acordos`;
        const pagamentosViewName = `v_bloco${blocoName}_pagamentos`;
        
        let acordosNovacoes = [];
        let pagamentosBordero = [];
        
        // Tentar usar views (mais rápido) - sem query de teste desnecessária
        try {
            // Queries otimizadas: as views já estão agrupadas, então não precisamos fazer GROUP BY novamente
            let acordosQuery, pagamentosQuery;
            
            if (groupBy === 'day') {
                // Modo diário: usar DATE_FORMAT para formatar
                acordosQuery = `
                    SELECT 
                        DATE_FORMAT(data, '%d/%m/%Y') as date,
                        date_formatted,
                        total_acordos
                    FROM ${acordosViewName}
                    WHERE 1=1 ${dateFilter ? 'AND data >= ? AND data <= ?' : ''}
                    ORDER BY data ASC
                `;
                
                pagamentosQuery = `
                    SELECT 
                        DATE_FORMAT(data, '%d/%m/%Y') as date,
                        date_formatted,
                        quantidade_pagamentos
                    FROM ${pagamentosViewName}
                    WHERE 1=1 ${dateFilter ? 'AND data >= ? AND data <= ?' : ''}
                    ORDER BY data ASC
                `;
            } else {
                // Modo mensal: usar campos pré-computados da view (já agrupados)
                // IMPORTANTE: Filtrar pela coluna 'data' (DATE) mas agrupar por mês
                // A view tem a coluna 'data' (data_emissao para acordos, data_pagamento para pagamentos)
                acordosQuery = `
                    SELECT 
                        date_month as date,
                        date_formatted,
                        SUM(total_acordos) as total_acordos
                    FROM ${acordosViewName}
                    WHERE 1=1 ${dateFilter ? 'AND data >= ? AND data <= ?' : ''}
                    GROUP BY ano, mes, date_month, date_formatted
                    ORDER BY ano ASC, mes ASC
                `;
                
                // Pagamentos: filtrados por bloco na view usando atraso_real/atraso
                // IMPORTANTE: Filtrar pela coluna 'data' (data_pagamento) mas agrupar por mês
                pagamentosQuery = `
                    SELECT 
                        date_month as date,
                        date_formatted,
                        SUM(quantidade_pagamentos) as quantidade_pagamentos
                    FROM ${pagamentosViewName}
                    WHERE 1=1 ${dateFilter ? 'AND data >= ? AND data <= ?' : ''}
                    GROUP BY ano, mes, date_month, date_formatted
                    ORDER BY ano ASC, mes ASC
                `;
            }
            
            const [acordosResult, pagamentosResult] = await Promise.all([
                queryParams.length > 0 
                    ? db.execute(acordosQuery, queryParams)
                    : db.execute(acordosQuery),
                queryParams.length > 0 
                    ? db.execute(pagamentosQuery, queryParams)
                    : db.execute(pagamentosQuery)
            ]);
            
            acordosNovacoes = acordosResult[0] || [];
            pagamentosBordero = pagamentosResult[0] || [];
        } catch (viewError) {
            // Se a view não existe, usar fallback para buscar diretamente das tabelas
            const NovacaoModel = require('./novacaoModel');
            const PagamentoModel = require('./pagamentoModel');
            
            [acordosNovacoes, pagamentosBordero] = await Promise.all([
                NovacaoModel.getAcordosPorBloco(bloco, startDate, endDate, groupBy),
                PagamentoModel.getPagamentosPorBloco(bloco, startDate, endDate, groupBy)
            ]);
        }
        
        // Criar mapas de datas para facilitar a combinação (otimizado)
        // IMPORTANTE: Usar date_formatted como chave para garantir correspondência correta
        // O date_formatted está no formato MM/YYYY (meses) ou DD/MM/YYYY (dias)
        const acordosMap = new Map();
        acordosNovacoes.forEach(item => {
            // Sempre usar date_formatted como chave (formato de exibição)
            const dateKey = item.date_formatted || item.date;
            // Converter total_acordos para número se for string
            const totalAcordos = typeof item.total_acordos === 'string' 
                ? parseInt(item.total_acordos, 10) 
                : (item.total_acordos || 0);
            acordosMap.set(dateKey, totalAcordos);
            // Também adicionar com date como fallback
            if (item.date && item.date !== dateKey) {
                acordosMap.set(item.date, totalAcordos);
            }
        });

        const pagamentosMap = new Map();
        pagamentosBordero.forEach(item => {
            // Sempre usar date_formatted como chave (formato de exibição)
            const dateKey = item.date_formatted || item.date;
            // Converter quantidade_pagamentos para número se for string
            const quantidadePagamentos = typeof item.quantidade_pagamentos === 'string'
                ? parseInt(item.quantidade_pagamentos, 10)
                : (item.quantidade_pagamentos || 0);
            pagamentosMap.set(dateKey, quantidadePagamentos);
            // Também adicionar com date como fallback
            if (item.date && item.date !== dateKey) {
                pagamentosMap.set(item.date, quantidadePagamentos);
            }
        });

        // Combinar CPCA (de vuon_resultados) com Acordos (de vuon_novacoes)
        const cpcaXAcordos = rows.map(row => {
            const dateKey = row.date_formatted || row.date;
            const acordos = acordosMap.get(dateKey) || 0;
            return {
                date: dateKey,
                cpca: row.cpca,
                acordos: acordos,
                percent: row.cpca > 0 ? parseFloat((acordos * 100.0 / row.cpca).toFixed(2)) : 0
            };
        });

        // Combinar Acordos (de vuon_novacoes) com Pagamentos (de vuon_bordero_pagamento)
        const acordosXPagamentos = rows.map(row => {
            const dateKey = row.date_formatted || row.date;
            // Tentar buscar com date_formatted primeiro, depois com date
            let acordos = acordosMap.get(dateKey);
            let pagamentos = pagamentosMap.get(dateKey);
            
            // Se não encontrou com date_formatted, tentar com date
            if (acordos === undefined && row.date && row.date !== dateKey) {
                acordos = acordosMap.get(row.date) || 0;
            } else {
                acordos = acordos || 0;
            }
            
            if (pagamentos === undefined && row.date && row.date !== dateKey) {
                pagamentos = pagamentosMap.get(row.date) || 0;
            } else {
                pagamentos = pagamentos || 0;
            }
            
            return {
                date: dateKey,
                acordos: acordos,
                pgto: pagamentos,
                percent: acordos > 0 ? parseFloat((pagamentos * 100.0 / acordos).toFixed(2)) : 0
            };
        });

        // Buscar spins e recebimento em paralelo (queries simples)
        const [spins, recebimento] = await Promise.all([
            this.getSpins(bloco),
            this.getRecebimento(bloco, startDate, endDate)
        ]);

        return {
            spins,
            recebimento,
            acionadosXCarteira,
            acionadosXAlo,
            aloXCpc,
            cpcXCpca,
            cpcaXAcordos,
            acordosXPagamentos
        };
    }
}

module.exports = BlocoModel;

