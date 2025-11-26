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
                        AND acao = 'ACD'
                    THEN 1 
                END) as acordos,
                ROUND(
                    COUNT(CASE 
                        WHEN agente != '0' 
                            AND agente IS NOT NULL 
                            AND agente != ''
                            AND acao = 'ACD'
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
    // IMPORTANTE: Ajustar as condições de "Acordos" e "Pagamentos" conforme necessário
    static async getAcordosXPagamentos(bloco, startDate = null, endDate = null) {
        const db = await getDB();
        const blocoCondition = this.getBlocoCondition(bloco);
        
        let dateFilter = '';
        if (startDate && endDate) {
            dateFilter = `AND data >= '${startDate}' AND data <= '${endDate}'`;
        }
        
        // Ajustar condições conforme necessário:
        // - Acordos: pode ser acao = 'ACD' ou outra ação
        // - Pagamentos: pode ser acao IN ('PGT', 'PGTO', 'PAG') ou baseado em valor > 0
        const query = `
            SELECT 
                data as date,
                COUNT(CASE 
                    WHEN agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                        AND acao = 'ACD'
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
                            AND acao = 'ACD'
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

    // Buscar todos os dados de um bloco - OTIMIZADO: uma única query por tipo de gráfico
    static async getBlocoData(bloco, startDate = null, endDate = null) {
        const db = await getDB();
        const blocoCondition = this.getBlocoCondition(bloco);
        
        // Usar prepared statements para melhor performance e segurança
        let dateFilter = '';
        const queryParams = [];
        
        if (startDate && endDate) {
            dateFilter = `AND data >= ? AND data <= ?`;
            queryParams.push(startDate, endDate);
        }

        // Query única que calcula todos os gráficos agrupados por mês
        // OTIMIZADA: 
        // - Usa YEAR e MONTH para melhor performance no GROUP BY (usa índices)
        // - Condições otimizadas para usar índices compostos
        // - Prepared statements para melhor cache de query
        const query = `
            SELECT 
                CONCAT(YEAR(data), '-', LPAD(MONTH(data), 2, '0')) as date,
                CONCAT(LPAD(MONTH(data), 2, '0'), '/', YEAR(data)) as date_formatted,
                -- Acionados x Carteira
                COUNT(*) as carteira,
                COUNT(CASE WHEN acao IS NOT NULL AND acao != '' THEN 1 END) as acionados,
                -- Acionados x Alô
                COUNT(CASE WHEN agente != '0' AND agente IS NOT NULL AND agente != '' THEN 1 END) as alo,
                -- Alô x CPC
                COUNT(CASE 
                    WHEN agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                        AND acao IN ('EIO', 'CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'APC', 'JUR', 'DDA')
                    THEN 1 
                END) as cpc,
                -- CPC x CPCA
                COUNT(CASE 
                    WHEN agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                        AND acao IN ('CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'JUR', 'DDA')
                    THEN 1 
                END) as cpca,
                -- CPCA x Acordos
                COUNT(CASE 
                    WHEN agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                        AND acao = 'ACD'
                    THEN 1 
                END) as acordos,
                -- Acordos x Pagamentos
                COUNT(CASE 
                    WHEN agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                        AND valor > 0
                    THEN 1 
                END) as pgto
            FROM vuon_resultados
            WHERE ${blocoCondition}
                ${dateFilter}
            GROUP BY YEAR(data), MONTH(data)
            ORDER BY YEAR(data) ASC, MONTH(data) ASC
        `;

        const [rows] = queryParams.length > 0 
            ? await db.execute(query, queryParams)
            : await db.execute(query);
        
        // Processar os dados para criar os arrays de cada gráfico
        // Usar date_formatted (MM/YYYY) para exibição
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

        // CPCA x Acordos: CPCA vem de vuon_resultados, Acordos vem de vuon_novacoes
        // Buscar acordos da tabela vuon_novacoes agrupados por CPF
        const acordosNovacoes = await NovacaoModel.getAcordosPorBloco(bloco, startDate, endDate);
        
        // Criar um mapa de datas para facilitar a combinação
        const acordosMap = new Map();
        acordosNovacoes.forEach(item => {
            acordosMap.set(item.date, item.total_acordos);
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

        // Acordos x Pagamentos: Acordos vem de vuon_novacoes, Pagamentos vem de vuon_bordero_pagamento
        // Buscar pagamentos da tabela vuon_bordero_pagamento
        const pagamentosBordero = await PagamentoModel.getPagamentosPorBloco(bloco, startDate, endDate);
        
        // Criar um mapa de datas para pagamentos
        const pagamentosMap = new Map();
        pagamentosBordero.forEach(item => {
            pagamentosMap.set(item.date, item.quantidade_pagamentos || 0);
        });

        // Combinar Acordos (de vuon_novacoes) com Pagamentos (de vuon_bordero_pagamento)
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

