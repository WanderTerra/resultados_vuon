const { getDB } = require('../config/db');
const PagamentoModel = require('./pagamentoModel');

class BlocoModel {
    // Função auxiliar para definir o bloco baseado em dias de atraso
    // Usa atraso_real se disponível, senão usa atraso (fallback)
    static getBlocoCondition(bloco) {
        // Verificar ambas as colunas: atraso_real primeiro, depois atraso
        switch(bloco) {
            case 1:
                // BLOCO 1: 61 a 90 dias de atraso
                return "((atraso_real >= 61 AND atraso_real <= 90) OR (atraso_real IS NULL AND atraso >= 61 AND atraso <= 90))";
            case 2:
                // BLOCO 2: 91 a 180 dias de atraso
                return "((atraso_real >= 91 AND atraso_real <= 180) OR (atraso_real IS NULL AND atraso >= 91 AND atraso <= 180))";
            case 3:
                // BLOCO 3: 181 a 360 dias de atraso
                return "((atraso_real >= 181 AND atraso_real <= 360) OR (atraso_real IS NULL AND atraso >= 181 AND atraso <= 360))";
            case 'wo':
                // WO: 361 a 9999 dias de atraso (mais de 360)
                return "((atraso_real >= 361 AND atraso_real <= 9999) OR (atraso_real IS NULL AND atraso >= 361 AND atraso <= 9999))";
            default:
                return "1=1"; // Todos os registros
        }
    }

    // Acionados x Carteira por data
    // Carteira = CPFs únicos na carteira (clientes únicos no período)
    // Acionados = CPFs únicos com ação (clientes únicos que têm ação)
    // IMPORTANTE: Este método usa query DIRETA da tabela vuon_resultados - NÃO usa views
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
                -- Carteira: CPFs únicos na carteira (todos os CPFs no período)
                COUNT(DISTINCT CASE WHEN cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN cpf_cnpj END) as carteira,
                -- Acionados: CPFs únicos com ação
                COUNT(DISTINCT CASE WHEN acao IS NOT NULL AND acao != '' AND cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN cpf_cnpj END) as acionados,
                ROUND(
                    COUNT(DISTINCT CASE WHEN acao IS NOT NULL AND acao != '' AND cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN cpf_cnpj END) * 100.0 / 
                    NULLIF(COUNT(DISTINCT CASE WHEN cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN cpf_cnpj END), 0), 
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
    // Acionados = clientes únicos (por CPF) que têm ação naquela data
    // Alô = clientes únicos (por CPF) que têm agente naquela data
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
                COUNT(DISTINCT CASE WHEN acao IS NOT NULL AND acao != '' AND cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN cpf_cnpj END) as acionados,
                COUNT(DISTINCT CASE 
                    WHEN agente != '0' AND agente IS NOT NULL AND agente != '' AND cpf_cnpj IS NOT NULL AND cpf_cnpj != ''
                    THEN cpf_cnpj 
                END) as alo,
                ROUND(
                    COUNT(DISTINCT CASE 
                        WHEN agente != '0' AND agente IS NOT NULL AND agente != '' AND cpf_cnpj IS NOT NULL AND cpf_cnpj != ''
                        THEN cpf_cnpj 
                    END) * 100.0 / 
                    NULLIF(COUNT(DISTINCT CASE WHEN acao IS NOT NULL AND acao != '' AND cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN cpf_cnpj END), 0), 
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
    // Alô: Todas as ocorrências de contato com agente (não CPF único, pois cliente pode atender várias vezes por dia)
    // CPC: Ações específicas com agente (EIO, CSA, ACD, SCP, APH, DEF, SRP, APC, JUR, DDA)
    // IMPORTANTE: CPC sempre será <= Alô, pois só é possível ter CPC se houve Alô (contato) primeiro
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
                -- Alô: Todas as ocorrências de contato com agente (não é CPF único)
                COUNT(CASE 
                    WHEN agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != '' 
                        AND cpf_cnpj IS NOT NULL 
                        AND cpf_cnpj != ''
                    THEN 1 
                END) as alo,
                -- CPC: Total de ações CPC (subconjunto de Alô, sempre <= Alô)
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
                        WHEN agente != '0' 
                            AND agente IS NOT NULL 
                            AND agente != '' 
                            AND cpf_cnpj IS NOT NULL 
                            AND cpf_cnpj != ''
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

    // Total de spins por bloco
    // DEFINIÇÃO (2025-12): Spins = total de acionamentos no período (todas as linhas em vuon_resultados)
    // => NÃO usar DISTINCT (uma pessoa pode receber múltiplos acionamentos no mesmo dia).
    // IMPORTANTE: quando houver startDate/endDate, aplicar filtro de data (para o número mudar quando o filtro muda).
    static async getSpins(bloco, startDate = null, endDate = null) {
        const db = await getDB();
        
        // OTIMIZAÇÃO: Usar tabela materializada quando possível (muito mais rápido)
        // A tabela materializada tem o campo 'spins' já calculado
        const blocoName = bloco === 'wo' ? 'wo' : String(bloco);

        // Se há filtro de data, preferir tabela materializada diária (bloco_spins_diario) por performance.
        // Observação: o job atualiza até ontem. Se endDate incluir hoje, somamos hoje direto da vuon_resultados.
        if (startDate && endDate) {
            const blocoName = bloco === 'wo' ? 'wo' : String(bloco);

            // 1) somar do materializado diário
            let total = 0;
            try {
                const [rows] = await db.execute(
                    `
                    SELECT COALESCE(SUM(spins), 0) as total
                    FROM bloco_spins_diario
                    WHERE bloco = ?
                      AND data >= ?
                      AND data <= ?
                    `,
                    [blocoName, startDate, endDate]
                );
                total = parseInt(rows[0]?.total || 0, 10);
            } catch (e) {
                // Se a tabela não existir ainda, cair para query direta
                total = 0;
            }

            // 2) se endDate inclui hoje, adicionar hoje via query direta (1 dia)
            const todayStr = new Date().toISOString().split('T')[0];
            if (endDate >= todayStr) {
                const blocoCondition = this.getBlocoCondition(bloco);
                const [rowsToday] = await db.execute(
                    `
                    SELECT COUNT(1) as spins
                    FROM vuon_resultados
                    WHERE ${blocoCondition}
                      AND data = ?
                    `,
                    [todayStr]
                );
                total += parseInt(rowsToday[0]?.spins || 0, 10);
            }

            // 3) fallback total: se a tabela diária não estava disponível e total ficou 0,
            // executar a query direta no período.
            if (total === 0) {
                const blocoCondition = this.getBlocoCondition(bloco);
                const [rows] = await db.execute(
                    `
                    SELECT COUNT(1) as spins
                    FROM vuon_resultados
                    WHERE ${blocoCondition}
                      AND data >= ?
                      AND data <= ?
                    `,
                    [startDate, endDate]
                );
                return rows[0]?.spins || 0;
            }

            return total;
        }
        
        try {
            // Tentar buscar da tabela materializada primeiro (muito mais rápido)
            const query = `
                SELECT SUM(spins) as spins
                FROM bloco_summary
                WHERE bloco = ?
            `;
            const [rows] = await db.execute(query, [blocoName]);
            const spins = rows[0]?.spins || 0;
            if (spins > 0) {
                return parseInt(spins);
            }
        } catch (error) {
            // Se a tabela materializada não existir ou houver erro, usar fallback
            console.log(`⚠️  getSpins - Erro ao usar tabela materializada, usando fallback: ${error.message}`);
        }
        
        // Fallback: query direta (mais lenta)
        const blocoCondition = this.getBlocoCondition(bloco);
        const query = `
            SELECT COUNT(1) as spins
            FROM vuon_resultados
            WHERE ${blocoCondition}
        `;
        const [rows] = await db.execute(query);
        return rows[0]?.spins || 0;
    }

    /**
     * Retorna o spins do "último dia" para o bloco:
     * - Preferência: ontem (yesterday)
     * - Fallback: último dia disponível na tabela bloco_spins_diario para o bloco
     *
     * @param {number|string} bloco
     * @returns {Promise<{date: string|null, spins: number}>}
     */
    static async getLastDaySpins(bloco) {
        const db = await getDB();
        const blocoName = bloco === 'wo' ? 'wo' : String(bloco);

        const today = new Date();
        const yesterdayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().split('T')[0];

        try {
            // 1) tentar ontem
            const [rowsY] = await db.execute(
                `
                SELECT spins
                FROM bloco_spins_diario
                WHERE bloco = ? AND data = ?
                LIMIT 1
                `,
                [blocoName, yesterday]
            );
            if (rowsY.length > 0) {
                return { date: yesterday, spins: parseInt(rowsY[0].spins || 0, 10) };
            }

            // 2) fallback: último dia disponível
            const [rowsLast] = await db.execute(
                `
                SELECT data, spins
                FROM bloco_spins_diario
                WHERE bloco = ?
                ORDER BY data DESC
                LIMIT 1
                `,
                [blocoName]
            );
            if (rowsLast.length > 0) {
                const d = rowsLast[0].data;
                const dateStr = d ? new Date(d).toISOString().split('T')[0] : null;
                return { date: dateStr, spins: parseInt(rowsLast[0].spins || 0, 10) };
            }
        } catch (_) {
            // Se a tabela não existir ou houver erro, devolver vazio
        }

        return { date: null, spins: 0 };
    }

    static async getLastDaySpinsAll() {
        const [b1, b2, b3, bwo] = await Promise.all([
            this.getLastDaySpins(1),
            this.getLastDaySpins(2),
            this.getLastDaySpins(3),
            this.getLastDaySpins('wo'),
        ]);
        return {
            bloco1: b1,
            bloco2: b2,
            bloco3: b3,
            wo: bwo,
        };
    }

    // Recebimento financeiro por bloco
    static async getRecebimento(bloco, startDate = null, endDate = null) {
        const db = await getDB();
        const blocoName = bloco === 'wo' ? 'wo' : String(bloco);
        
        // OTIMIZAÇÃO: Usar tabela materializada quando possível (muito mais rápido)
        // A tabela materializada tem o campo 'recebimento' já calculado
        try {
            let query, queryParams;
            
            if (startDate && endDate) {
                // Filtrar por range de datas na tabela materializada usando ano/mês
                const startYear = parseInt(startDate.split('-')[0]);
                const startMonth = parseInt(startDate.split('-')[1]);
                const endYear = parseInt(endDate.split('-')[0]);
                const endMonth = parseInt(endDate.split('-')[1]);
                
                query = `
                    SELECT COALESCE(SUM(recebimento), 0) as total
                    FROM bloco_summary
                    WHERE bloco = ?
                        AND (
                            (ano > ? OR (ano = ? AND mes >= ?))
                            AND (ano < ? OR (ano = ? AND mes <= ?))
                        )
                `;
                queryParams = [blocoName, startYear, startYear, startMonth, endYear, endYear, endMonth];
            } else {
                // Sem filtros: buscar todos os meses
                query = `
                    SELECT COALESCE(SUM(recebimento), 0) as total
                    FROM bloco_summary
                    WHERE bloco = ?
                `;
                queryParams = [blocoName];
            }
            
            const [rows] = await db.execute(query, queryParams);
            const total = parseFloat(rows[0]?.total || 0);
            if (total > 0 || !startDate || !endDate) {
                // Se encontrou dados ou não há filtros, retornar
                return total;
            }
        } catch (error) {
            // Se a tabela materializada não existir ou houver erro, usar fallback
            console.log(`⚠️  getRecebimento - Erro ao usar tabela materializada, usando fallback: ${error.message}`);
        }
        
        // Fallback: query direta (mais lenta)
        const blocoCondition = this.getBlocoCondition(bloco);
        let dateFilter = '';
        const queryParams = [];
        
        if (startDate && endDate) {
            dateFilter = `AND data >= ? AND data <= ?`;
            queryParams.push(startDate, endDate);
        }
        
        const query = `
            SELECT COALESCE(SUM(valor), 0) as total
            FROM vuon_resultados
            WHERE ${blocoCondition}
                AND valor > 0
                ${dateFilter}
        `;
        const [rows] = queryParams.length > 0 
            ? await db.execute(query, queryParams)
            : await db.execute(query);
        return parseFloat(rows[0]?.total || 0);
    }

    // Buscar todos os dados de um bloco - OTIMIZADO: usa queries diretas da tabela
    // IMPORTANTE: Eliminamos completamente o uso de views para acionadosXCarteira
    // Todas as queries são diretas da tabela vuon_resultados para melhor performance
    static async getBlocoData(bloco, startDate = null, endDate = null, groupBy = 'month') {
        const db = await getDB();
        
        // NOTA: Views agregadas são MUITO LENTAS (30-90s) porque fazem COUNT(DISTINCT) em toda a tabela
        // Por isso, SEMPRE usamos queries diretas na tabela vuon_resultados
        // Eliminamos completamente o uso de views para acionadosXCarteira
        
        const blocoName = bloco === 'wo' ? 'wo' : String(bloco);
        
        // Usar prepared statements para melhor performance e segurança
        // IMPORTANTE: queryParams será usado para queries de acordos/pagamentos
        let dateFilter = '';
        const queryParams = [];
        
        if (startDate && endDate) {
            // IMPORTANTE: Filtrar pela coluna 'data' da tabela vuon_resultados
            // Mesmo quando agrupamos por mês, precisamos filtrar pela data original
            dateFilter = `AND data >= ? AND data <= ?`;
            queryParams.push(startDate, endDate);
            console.log(`📊 Bloco ${bloco} - Aplicando filtro: ${startDate} até ${endDate}, groupBy: ${groupBy}`);
        }
        
        // Preservar queryParams originais para usar nas queries de acordos/pagamentos
        const originalQueryParams = [...queryParams];

        // Determinar agrupamento: por dia ou por mês
        let dateSelect, dateFormatted, groupByClause, orderByClause;
        
        if (groupBy === 'day') {
            // Agrupamento por dia - usar DATE() diretamente
            dateSelect = `DATE(data) as date`;
            dateFormatted = `DATE_FORMAT(data, '%d/%m/%Y') as date_formatted`;
            groupByClause = `DATE(data)`;
            orderByClause = `DATE(data) ASC`;
        } else {
            // Agrupamento por mês (padrão) - usar funções SQL diretamente
            // IMPORTANTE: Não usar campos da view, usar funções SQL
            dateSelect = `CONCAT(YEAR(data), '-', LPAD(MONTH(data), 2, '0')) as date`;
            dateFormatted = `CONCAT(LPAD(MONTH(data), 2, '0'), '/', YEAR(data)) as date_formatted`;
            groupByClause = `YEAR(data), MONTH(data)`;
            orderByClause = `YEAR(data) ASC, MONTH(data) ASC`;
        }

        // Query otimizada: quando agrupar por mês, contar DISTINCT cpf_cnpj diretamente
        // IMPORTANTE: Cada CPF conta apenas 1 vez por mês, mesmo que tenha múltiplas ações
        // 
        // ESTRATÉGIA DE OTIMIZAÇÃO:
        // - Se groupBy === 'month': usar query direta (mais rápido)
        // - Se groupBy === 'day' E há filtros de data: usar query direta (mais rápido que view sem filtro)
        // - Se groupBy === 'day' E NÃO há filtros: usar view (pré-computada, mas ainda lenta)
        let query;
        
        // Determinar se vamos usar tabela materializada (sempre para month, nunca para day)
        const useSummaryTable = groupBy === 'month';
        let summaryQueryParams; // Declarar no escopo externo para usar na execução da query
        
        if (groupBy === 'month') {
            // OTIMIZAÇÃO: SEMPRE usar tabela materializada para month (MUITO mais rápida)
            // A tabela materializada tem todos os meses, então podemos filtrar por ano/mês
            const blocoName = bloco === 'wo' ? 'wo' : String(bloco);
            console.log(`⚡ Usando tabela materializada bloco_summary para Bloco ${bloco} (OTIMIZADO)`);
            
            let summaryFilter = '';
            const summaryParams = [blocoName];
            
            if (startDate && endDate) {
                // Filtrar por range de datas na tabela materializada usando ano/mês
                const startYear = parseInt(startDate.split('-')[0]);
                const startMonth = parseInt(startDate.split('-')[1]);
                const endYear = parseInt(endDate.split('-')[0]);
                const endMonth = parseInt(endDate.split('-')[1]);
                
                // Criar condições para filtrar por ano/mês
                summaryFilter = `AND (
                    (ano > ? OR (ano = ? AND mes >= ?))
                    AND (ano < ? OR (ano = ? AND mes <= ?))
                )`;
                summaryParams.push(startYear, startYear, startMonth, endYear, endYear, endMonth);
                console.log(`   📅 Filtrando: ${startMonth}/${startYear} até ${endMonth}/${endYear}`);
            }
            
            query = `
                SELECT 
                    date_formatted as date,
                    date_formatted,
                    carteira,
                    acionados,
                    alo,
                    cpc,
                    cpca,
                    acordos_resultados,
                    pgto_resultados,
                    spins,
                    recebimento
                FROM bloco_summary
                WHERE bloco = ?
                    ${summaryFilter}
                ORDER BY ano ASC, mes ASC
            `;
            
            // Usar os parâmetros da summary para a query principal
            // Mas manter originalQueryParams para queries de acordos/pagamentos
            summaryQueryParams = [...summaryParams];
        } else {
            // groupBy === 'day' - ainda usar query direta (não temos tabela materializada para dias)
            const blocoCondition = this.getBlocoCondition(bloco);
            
            if (startDate && endDate) {
                // OTIMIZADO: Query direta com filtros de data (mais rápido que view)
                console.log(`⚡ Usando query direta para groupBy='day' com filtros de data (otimizado)`);
                query = `
                SELECT 
                    ${dateSelect},
                    ${dateFormatted},
                    -- Carteira: CPFs únicos na carteira no mês
                    COUNT(DISTINCT CASE WHEN cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN cpf_cnpj END) as carteira,
                    -- Acionados: CPFs únicos com ação no mês (1 CPF = 1 acionado, mesmo com múltiplas ações)
                    COUNT(DISTINCT CASE WHEN acao IS NOT NULL AND acao != '' AND cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN cpf_cnpj END) as acionados,
                    -- Alô: Todas as ocorrências de contato com agente (não CPF único, cliente pode atender várias vezes)
                    COUNT(CASE WHEN agente != '0' AND agente IS NOT NULL AND agente != '' AND cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN 1 END) as alo,
                    -- Alô x CPC
                    SUM(CASE 
                        WHEN agente != '0' AND agente IS NOT NULL AND agente != ''
                        AND acao IN ('EIO', 'CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'APC', 'JUR', 'DDA')
                        THEN 1 ELSE 0 END
                    ) as cpc,
                    -- CPC x CPCA
                    SUM(CASE 
                        WHEN agente != '0' AND agente IS NOT NULL AND agente != ''
                        AND acao IN ('CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'JUR', 'DDA')
                        THEN 1 ELSE 0 END
                    ) as cpca,
                    -- CPCA x Acordos (será combinado com dados de novacoes)
                    SUM(CASE 
                        WHEN agente != '0' AND agente IS NOT NULL AND agente != ''
                        AND acao = 'DDA'
                        THEN 1 ELSE 0 END
                    ) as acordos_resultados,
                    -- Acordos x Pagamentos (será combinado com dados de pagamentos)
                    SUM(CASE 
                        WHEN agente != '0' AND agente IS NOT NULL AND agente != ''
                        AND valor > 0
                        THEN 1 ELSE 0 END
                    ) as pgto_resultados,
                    -- Spins (total de acionamentos no mês)
                    COUNT(1) as spins,
                    -- Recebimento
                    COALESCE(SUM(CASE WHEN valor > 0 THEN valor ELSE 0 END), 0) as recebimento
                FROM vuon_resultados
                WHERE ${blocoCondition}
                    ${dateFilter}
                GROUP BY ${groupByClause}
                ORDER BY ${orderByClause}
            `;
            } else {
                // Sem filtros de data para groupBy='day' - usar query direta (ainda lenta)
                console.log(`⚠️  Usando query direta para groupBy='day' sem filtros (lenta)`);
                query = `
                    SELECT 
                        ${dateSelect},
                        ${dateFormatted},
                        -- Carteira: CPFs únicos na carteira no dia
                        COUNT(DISTINCT CASE WHEN cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN cpf_cnpj END) as carteira,
                        -- Acionados: CPFs únicos com ação no dia (1 CPF = 1 acionado por dia)
                        COUNT(DISTINCT CASE WHEN acao IS NOT NULL AND acao != '' AND cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN cpf_cnpj END) as acionados,
                        -- Alô: Todas as ocorrências de contato com agente no dia (não CPF único, cliente pode atender várias vezes)
                        COUNT(CASE WHEN agente != '0' AND agente IS NOT NULL AND agente != '' AND cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN 1 END) as alo,
                        -- Alô x CPC
                        SUM(CASE 
                            WHEN agente != '0' AND agente IS NOT NULL AND agente != ''
                            AND acao IN ('EIO', 'CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'APC', 'JUR', 'DDA')
                            THEN 1 ELSE 0 END
                        ) as cpc,
                        -- CPC x CPCA
                        SUM(CASE 
                            WHEN agente != '0' AND agente IS NOT NULL AND agente != ''
                            AND acao IN ('CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'JUR', 'DDA')
                            THEN 1 ELSE 0 END
                        ) as cpca,
                        -- CPCA x Acordos (será combinado com dados de novacoes)
                        SUM(CASE 
                            WHEN agente != '0' AND agente IS NOT NULL AND agente != ''
                            AND acao = 'DDA'
                            THEN 1 ELSE 0 END
                        ) as acordos_resultados,
                        -- Acordos x Pagamentos (será combinado com dados de pagamentos)
                        SUM(CASE 
                            WHEN agente != '0' AND agente IS NOT NULL AND agente != ''
                            AND valor > 0
                            THEN 1 ELSE 0 END
                        ) as pgto_resultados,
                        -- Spins (total de acionamentos no dia)
                        COUNT(1) as spins,
                        -- Recebimento
                        COALESCE(SUM(CASE WHEN valor > 0 THEN valor ELSE 0 END), 0) as recebimento
                    FROM vuon_resultados
                    WHERE ${blocoCondition}
                    GROUP BY ${groupByClause}
                    ORDER BY ${orderByClause}
                `;
            }
        }

        const queryStart = Date.now();
        // Usar summaryQueryParams se existir (tabela materializada), senão usar queryParams
        let paramsToUse;
        if (groupBy === 'month' && typeof summaryQueryParams !== 'undefined') {
            paramsToUse = summaryQueryParams;
        } else {
            paramsToUse = queryParams;
        }
        const [rows] = paramsToUse.length > 0 
            ? await db.execute(query, paramsToUse)
            : await db.execute(query);
        const queryTime = Date.now() - queryStart;
        console.log(`⏱️  Query executada em ${(queryTime / 1000).toFixed(2)}s (${queryTime}ms)`);
        
        console.log(`📊 Bloco ${bloco} - Total de registros retornados: ${rows.length}`);
        if (rows.length > 0) {
            console.log(`📊 Primeiros meses: ${rows.slice(0, 3).map(r => r.date_formatted || r.date).join(', ')}`);
            
            // Log detalhado dos primeiros 3 registros para debug
            console.log(`\n🔍 Bloco ${bloco} - DETALHAMENTO DOS PRIMEIROS REGISTROS:`);
            rows.slice(0, 3).forEach(r => {
                const percent = r.carteira > 0 ? parseFloat((r.acionados * 100.0 / r.carteira).toFixed(2)) : 0;
                console.log(`   ${r.date_formatted || r.date}: Carteira=${r.carteira.toLocaleString()}, Acionados=${r.acionados.toLocaleString()}, %=${percent}%`);
            });
            console.log('');
        }
        
        // Processar os dados para criar os arrays de cada gráfico
        // Usar date_formatted para exibição
        const acionadosXCarteira = rows.map(row => {
            const percent = row.carteira > 0 ? parseFloat((row.acionados * 100.0 / row.carteira).toFixed(2)) : 0;
            
            // Log para debug (apenas se percentual estiver muito baixo)
            if (percent < 90 && row.carteira > 100) {
                console.log(`⚠️  Bloco ${bloco} - ${row.date_formatted || row.date}: Carteira=${row.carteira}, Acionados=${row.acionados}, %=${percent}`);
            }
            
            return {
                date: row.date_formatted || row.date,
                carteira: row.carteira,
                acionados: row.acionados,
                percent: percent
            };
        });

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

        // OTIMIZAÇÃO: Buscar pagamentos usando views pré-computadas
        // IMPORTANTE: Acordos vêm de acordos_resultados (já calculado em rows)
        // - Modo mensal: acordos_resultados vem da bloco_summary (populada de vuon_resultados)
        // - Modo diário: acordos_resultados vem da query direta em vuon_resultados
        // Não buscar acordos de vuon_novacoes, usar acordos_resultados que já está em rows
        let pagamentosBordero = [];
        
        // Criar mapa de acordos a partir de acordos_resultados já calculado em rows
        const acordosMap = new Map();
        rows.forEach(row => {
            const dateKey = row.date_formatted || row.date;
            const acordos = row.acordos_resultados || 0;
            acordosMap.set(dateKey, acordos);
            // Também adicionar com date como fallback
            if (row.date && row.date !== dateKey) {
                acordosMap.set(row.date, acordos);
            }
        });
        
        // Buscar pagamentos de vuon_bordero_pagamento (não temos na bloco_summary)
        const pagamentosViewName = `v_bloco${blocoName}_pagamentos`;
        
        // Tentar usar views (mais rápido) - apenas para pagamentos
        try {
            let pagamentosQuery;
            
            if (groupBy === 'day') {
                // Modo diário: usar DATE_FORMAT para formatar
                pagamentosQuery = `
                    SELECT 
                        DATE_FORMAT(data, '%d/%m/%Y') as date,
                        date_formatted,
                        quantidade_pagamentos
                    FROM ${pagamentosViewName}
                    WHERE 1=1 ${originalQueryParams.length > 0 ? 'AND data >= ? AND data <= ?' : ''}
                    ORDER BY data ASC
                `;
            } else {
                // Modo mensal: usar PagamentoModel diretamente para garantir mesma lógica
                // A view agrupa por DIA, e somar pode contar CPFs múltiplas vezes se pagaram em dias diferentes
                const PagamentoModel = require('./pagamentoModel');
                const pagamentosFromModel = await PagamentoModel.getPagamentosPorBloco(bloco, startDate, endDate, 'month');
                // PagamentoModel.getPagamentosPorBloco() retorna: { date: 'MM/YYYY' (prioriza date_formatted), quantidade_pagamentos: number }
                // Precisamos converter para o formato esperado pelo restante do código
                pagamentosBordero = pagamentosFromModel.map(item => {
                    // item.date pode ser 'MM/YYYY' ou 'YYYY-MM', dependendo do que foi retornado
                    let dateFormatted = item.date; // Formato MM/YYYY
                    let date = item.date; // Formato para comparação
                    
                    // Se está no formato MM/YYYY, converter para YYYY-MM para date
                    if (item.date && item.date.includes('/')) {
                        const [month, year] = item.date.split('/');
                        date = `${year}-${month.padStart(2, '0')}`; // YYYY-MM
                    } else if (item.date && item.date.includes('-')) {
                        // Se já está em YYYY-MM, converter para MM/YYYY para date_formatted
                        if (item.date.length === 7) {
                            const [year, month] = item.date.split('-');
                            dateFormatted = `${month}/${year}`;
                        }
                    }
                    
                    return {
                        date: date, // Formato: YYYY-MM
                        date_formatted: dateFormatted, // Formato: MM/YYYY
                        quantidade_pagamentos: item.quantidade_pagamentos
                    };
                });
            }
            
            // Executar query de pagamentos apenas no modo diário (modo mensal já foi tratado acima)
            if (groupBy === 'day') {
                const pagamentosResult = originalQueryParams.length > 0 
                    ? await db.execute(pagamentosQuery, originalQueryParams)
                    : await db.execute(pagamentosQuery);
                pagamentosBordero = pagamentosResult[0] || [];
            }
            
            // Log resumido apenas se não houver dados (para debug)
            if (pagamentosBordero.length === 0) {
                console.log(`⚠️  Bloco ${bloco} - Pagamentos: ${pagamentosBordero.length}`);
            }
        } catch (viewError) {
            // Se a view não existe, usar fallback para buscar diretamente das tabelas
            console.log(`⚠️  View de pagamentos não encontrada, usando fallback: ${viewError.message}`);
            const PagamentoModel = require('./pagamentoModel');
            
            pagamentosBordero = await PagamentoModel.getPagamentosPorBloco(bloco, startDate, endDate, groupBy);
            
            console.log(`📊 Bloco ${bloco} - Pagamentos (fallback): ${pagamentosBordero.length}`);
        }
        
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

        // Combinar CPCA (de vuon_resultados) com Acordos (de vuon_resultados via acordos_resultados)
        const cpcaXAcordos = rows.map(row => {
            const dateKey = row.date_formatted || row.date;
            const acordos = acordosMap.get(dateKey) || row.acordos_resultados || 0;
            return {
                date: dateKey,
                cpca: row.cpca,
                acordos: acordos,
                percent: row.cpca > 0 ? parseFloat((acordos * 100.0 / row.cpca).toFixed(2)) : 0
            };
        });

        // Combinar Acordos (de vuon_resultados via acordos_resultados) com Pagamentos (de vuon_bordero_pagamento)
        // IMPORTANTE: Usar date_formatted como chave principal para correspondência correta
        const acordosXPagamentos = rows.map(row => {
            const dateKey = row.date_formatted || row.date;
            // Buscar acordos do mapa (populado de acordos_resultados) ou usar diretamente de row
            let acordos = acordosMap.get(dateKey) || row.acordos_resultados || 0;
            let pagamentos = pagamentosMap.get(dateKey) || 0;
            
            // Se não encontrou com date_formatted, tentar com date
            if (acordos === 0 && row.date && row.date !== dateKey) {
                acordos = acordosMap.get(row.date) || row.acordos_resultados || 0;
            }
            
            if (pagamentos === 0 && row.date && row.date !== dateKey) {
                pagamentos = pagamentosMap.get(row.date) || 0;
            }
            
            return {
                date: dateKey,
                acordos: acordos,
                pgto: pagamentos,
                percent: acordos > 0 ? parseFloat((pagamentos * 100.0 / acordos).toFixed(2)) : 0
            };
        });

        // Buscar spins e recebimento em paralelo (queries simples)
        const spinsRecebimentoStart = Date.now();
        const [spins, recebimento, lastDay] = await Promise.all([
            this.getSpins(bloco, startDate, endDate),
            this.getRecebimento(bloco, startDate, endDate),
            this.getLastDaySpins(bloco)
        ]);
        const spinsRecebimentoTime = Date.now() - spinsRecebimentoStart;
        console.log(`⏱️  getSpins + getRecebimento executados em ${(spinsRecebimentoTime / 1000).toFixed(2)}s (${spinsRecebimentoTime}ms)`);

        return {
            spins,
            spinsLastDay: lastDay?.spins || 0,
            spinsLastDayDate: lastDay?.date || null,
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

