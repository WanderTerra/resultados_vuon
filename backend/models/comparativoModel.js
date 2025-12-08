const { getDB } = require('../config/db');
const BlocoModel = require('./blocoModel');
const NovacaoModel = require('./novacaoModel');
const PagamentoModel = require('./pagamentoModel');
const RecebimentoCobradorModel = require('./recebimentoCobradorModel');

class ComparativoModel {
    /**
     * Busca dados comparativos entre múltiplos períodos
     * @param {Object} filters - Filtros: { bloco, clientesVirgens, agenteId, groupBy }
     * @param {Array} periodosArray - Array de períodos [{startDate, endDate, nome}, ...]
     * @returns {Promise<Object>} Dados comparativos
     */
    static async getComparativoMultiplos(filters, periodosArray) {
        const { bloco, clientesVirgens, agenteId, groupBy = 'day' } = filters;
        
        console.log(`📊 ComparativoModel.getComparativoMultiplos - Processando ${periodosArray.length} períodos`);
        
        // Buscar dados de todos os períodos em paralelo
        const dadosPeriodos = await Promise.all(
            periodosArray.map((periodo, idx) => {
                console.log(`   📊 Buscando dados do período ${idx + 1}: ${periodo.nome || `Período ${idx + 1}`} (${periodo.startDate} até ${periodo.endDate})`);
                return this.getDadosPeriodo(bloco, clientesVirgens, agenteId, periodo.startDate, periodo.endDate, groupBy);
            })
        );

        console.log(`✅ ComparativoModel - Dados de ${dadosPeriodos.length} períodos obtidos`);

        // Buscar dados de agentes para cada período em paralelo
        console.log(`📊 ComparativoModel - Buscando dados de agentes para ${periodosArray.length} períodos`);
        const dadosAgentesPeriodos = await Promise.all(
            periodosArray.map((periodo, idx) => {
                console.log(`   📊 Buscando agentes do período ${idx + 1}: ${periodo.nome || `Período ${idx + 1}`}`);
                return this.getDadosAgentesPorPeriodo(bloco, clientesVirgens, periodo.startDate, periodo.endDate);
            })
        );

        console.log(`✅ ComparativoModel - Dados de agentes de ${dadosAgentesPeriodos.length} períodos obtidos`);

        // Combinar dados com nomes dos períodos
        const periodos = periodosArray.map((periodo, index) => {
            const periodoCompleto = {
                nome: periodo.nome || `Período ${index + 1}`,
                startDate: periodo.startDate,
                endDate: periodo.endDate,
                dados: dadosPeriodos[index] || [],
                agentes: dadosAgentesPeriodos[index] || []
            };
            console.log(`   ✅ Período ${index + 1}: ${periodoCompleto.nome} - ${periodoCompleto.dados.length} registros, ${periodoCompleto.agentes.length} agentes`);
            return periodoCompleto;
        });

        console.log(`✅ ComparativoModel - Retornando ${periodos.length} períodos completos`);

        return {
            periodos: periodos
        };
    }

    /**
     * Busca dados comparativos entre dois períodos (método legado - mantido para compatibilidade)
     * @param {Object} filters - Filtros: { bloco, clientesVirgens, agenteId, groupBy }
     * @param {string} startDate1 - Data inicial do período 1 (ex: '2024-10-01')
     * @param {string} endDate1 - Data final do período 1 (ex: '2024-10-31')
     * @param {string} startDate2 - Data inicial do período 2 (ex: '2024-11-01')
     * @param {string} endDate2 - Data final do período 2 (ex: '2024-11-30')
     * @returns {Promise<Object>} Dados comparativos
     */
    static async getComparativo(filters, startDate1, endDate1, startDate2, endDate2) {
        const periodosArray = [
            { startDate: startDate1, endDate: endDate1, nome: 'Período 1' },
            { startDate: startDate2, endDate: endDate2, nome: 'Período 2' }
        ];
        return await this.getComparativoMultiplos(filters, periodosArray);
    }

    /**
     * Busca dados de um período específico
     */
    static async getDadosPeriodo(bloco, clientesVirgens, agenteId, startDate, endDate, groupBy) {
        const db = await getDB();
        
        // Construir condições de filtro
        const blocoCondition = this.getBlocoCondition(bloco);
        const agenteFilter = agenteId ? `AND agente_id = ${agenteId}` : '';
        // Nota: vuon_resultados usa campo 'agente' como string, não temos correspondência direta com agente_id
        // Por enquanto, não filtramos por agente em vuon_resultados
        const agenteFilterResultados = ''; // TODO: Implementar mapeamento se necessário
        
        // Função auxiliar para gerar cláusulas de agrupamento
        const getDateClauses = (dateColumn) => {
            if (groupBy === 'week') {
                return {
                    dateSelect: `DATE_FORMAT(DATE_SUB(${dateColumn}, INTERVAL WEEKDAY(${dateColumn}) DAY), '%Y-%m-%d') as date`,
                    dateFormatted: `DATE_FORMAT(DATE_SUB(${dateColumn}, INTERVAL WEEKDAY(${dateColumn}) DAY), '%d/%m/%Y') as date_formatted`,
                    groupByClause: `YEAR(${dateColumn}), WEEK(${dateColumn})`,
                    orderByClause: `YEAR(${dateColumn}) ASC, WEEK(${dateColumn}) ASC`
                };
            } else if (groupBy === 'month') {
                return {
                    dateSelect: `CONCAT(YEAR(${dateColumn}), '-', LPAD(MONTH(${dateColumn}), 2, '0')) as date`,
                    dateFormatted: `CONCAT(LPAD(MONTH(${dateColumn}), 2, '0'), '/', YEAR(${dateColumn})) as date_formatted`,
                    groupByClause: `YEAR(${dateColumn}), MONTH(${dateColumn})`,
                    orderByClause: `YEAR(${dateColumn}) ASC, MONTH(${dateColumn}) ASC`
                };
            } else {
                // day
                return {
                    dateSelect: `DATE(${dateColumn}) as date`,
                    dateFormatted: `DATE_FORMAT(${dateColumn}, '%d/%m/%Y') as date_formatted`,
                    groupByClause: `DATE(${dateColumn})`,
                    orderByClause: `DATE(${dateColumn}) ASC`
                };
            }
        };

        const dataClauses = getDateClauses('data');
        const emissaoClauses = getDateClauses('data_emissao');
        const pagamentoClauses = getDateClauses('data_pagamento');

        // 1. Número de clientes únicos cobrados (vuon_resultados)
        // Se clientesVirgens = true, usar query especial que conta apenas primeira aparição
        // Se clientesVirgens = false, contar todos os CPFs únicos no período
        let clientesCobradosQuery;
        if (clientesVirgens === true) {
            // Usar exatamente a mesma lógica do ClientesVirgensModel
            // Query correta: subquery agrupa por cpf_cnpj e pega MIN(data), query externa agrupa por período e conta
            // Filtro de bloco: adiciona AND atraso >= X AND atraso <= Y na subquery
            // Filtro de data: adiciona AND t.first_date >= ? AND t.first_date <= ? na query externa
            const atrasoCondition = blocoCondition !== '1=1' ? `AND ${blocoCondition}` : '';
            
            if (groupBy === 'month') {
                // Agrupamento por mês - usar EXATAMENTE a mesma lógica do ClientesVirgensModel
                // DATE_FORMAT(t.first_date, '%Y-%m-01') agrupa por mês
                clientesCobradosQuery = `
                    SELECT
                        DATE_FORMAT(t.first_date, '%Y-%m-01') as date,
                        CONCAT(LPAD(MONTH(t.first_date), 2, '0'), '/', YEAR(t.first_date)) as date_formatted,
                        COUNT(*) as clientes_unicos_cobrados
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
                    WHERE t.first_date >= '${startDate}' 
                        AND t.first_date <= '${endDate}'
                    GROUP BY DATE_FORMAT(t.first_date, '%Y-%m-01')
                    ORDER BY DATE_FORMAT(t.first_date, '%Y-%m-01')
                `;
            } else if (groupBy === 'week') {
                // Agrupamento por semana
                clientesCobradosQuery = `
                    SELECT
                        DATE_FORMAT(DATE_SUB(t.first_date, INTERVAL WEEKDAY(t.first_date) DAY), '%Y-%m-%d') as date,
                        DATE_FORMAT(DATE_SUB(t.first_date, INTERVAL WEEKDAY(t.first_date) DAY), '%d/%m/%Y') as date_formatted,
                        COUNT(*) as clientes_unicos_cobrados
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
                    WHERE t.first_date >= '${startDate}' 
                        AND t.first_date <= '${endDate}'
                    GROUP BY YEAR(t.first_date), WEEK(t.first_date)
                    ORDER BY YEAR(t.first_date), WEEK(t.first_date)
                `;
            } else {
                // Agrupamento por dia
                clientesCobradosQuery = `
                    SELECT
                        DATE(t.first_date) as date,
                        DATE_FORMAT(t.first_date, '%d/%m/%Y') as date_formatted,
                        COUNT(*) as clientes_unicos_cobrados
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
                    WHERE t.first_date >= '${startDate}' 
                        AND t.first_date <= '${endDate}'
                    GROUP BY DATE(t.first_date)
                    ORDER BY DATE(t.first_date)
                `;
            }
        } else {
            // Clientes normais: contar todos os CPFs únicos no período
            clientesCobradosQuery = `
                SELECT 
                    ${dataClauses.dateSelect},
                    ${dataClauses.dateFormatted},
                    COUNT(DISTINCT cpf_cnpj) as clientes_unicos_cobrados
                FROM vuon_resultados
                WHERE ${blocoCondition}
                    AND cpf_cnpj IS NOT NULL 
                    AND cpf_cnpj != ''
                    AND DATE(data) >= '${startDate}' 
                    AND DATE(data) <= '${endDate}'
                    ${agenteFilterResultados}
                GROUP BY ${dataClauses.groupByClause}
                ORDER BY ${dataClauses.orderByClause}
            `;
        }

        // 2. Número de acordos (vuon_novacoes) - agrupado por CPF
        // Query correta: subquery agrupa por cpf_cnpj e DATE(data_emissao) e soma valor_total
        // Query externa agrupa por período e conta CPFs únicos e soma valores
        const acordosBlocoCondition = NovacaoModel.getBlocoCondition(bloco);
        
        // Se houver filtro de agente, buscar o ID e nome do agente primeiro
        // A tabela vuon_novacoes tem a coluna 'agente' (varchar) no formato "ID - NOME" (ex: "512 - OCTAVIO DE ALMEIDA")
        // Agentes com apenas "-" são do sistema
        let agenteFilterNovacoes = '';
        if (agenteId) {
            // Buscar o ID e nome do agente de recebimentos_por_cobrador
            try {
                const [agenteRows] = await db.execute(
                    'SELECT agente_id, agente_nome FROM recebimentos_por_cobrador WHERE agente_id = ? LIMIT 1',
                    [agenteId]
                );
                if (agenteRows.length > 0) {
                    const agenteIdNum = agenteRows[0].agente_id;
                    const agenteNome = agenteRows[0].agente_nome;
                    // Formatar como "ID - NOME" para corresponder ao formato em vuon_novacoes
                    const agenteFormatado = `${agenteIdNum} - ${agenteNome}`;
                    // Escapar aspas simples para evitar SQL injection
                    agenteFilterNovacoes = `AND agente = '${agenteFormatado.replace(/'/g, "''")}'`;
                }
            } catch (error) {
                console.error('Erro ao buscar nome do agente:', error);
            }
        }
        
        // Construir cláusulas de agrupamento específicas para acordos
        let acordosDateSelect, acordosDateFormatted, acordosGroupBy, acordosOrderBy;
        
        if (groupBy === 'month') {
            // Usar o mesmo formato de data que a query de valor recuperado para garantir matching
            acordosDateSelect = `CONCAT(YEAR(data_emissao), '-', LPAD(MONTH(data_emissao), 2, '0'), '-01') as date`;
            acordosDateFormatted = `DATE_FORMAT(CONCAT(YEAR(data_emissao), '-', LPAD(MONTH(data_emissao), 2, '0'), '-01'), '%m/%Y') as date_formatted`;
            acordosGroupBy = `YEAR(data_emissao), MONTH(data_emissao)`;
            acordosOrderBy = `YEAR(data_emissao), MONTH(data_emissao)`;
        } else if (groupBy === 'week') {
            acordosDateSelect = `DATE_FORMAT(DATE_SUB(data_emissao, INTERVAL WEEKDAY(data_emissao) DAY), '%Y-%m-%d') as date`;
            acordosDateFormatted = `DATE_FORMAT(DATE_SUB(data_emissao, INTERVAL WEEKDAY(data_emissao) DAY), '%d/%m/%Y') as date_formatted`;
            acordosGroupBy = `YEAR(data_emissao), WEEK(data_emissao)`;
            acordosOrderBy = `YEAR(data_emissao), WEEK(data_emissao)`;
        } else {
            // day
            acordosDateSelect = `DATE(data_emissao) as date`;
            acordosDateFormatted = `DATE_FORMAT(data_emissao, '%d/%m/%Y') as date_formatted`;
            acordosGroupBy = `DATE(data_emissao)`;
            acordosOrderBy = `DATE(data_emissao)`;
        }
        
        const acordosQuery = `
            SELECT 
                ${acordosDateSelect},
                ${acordosDateFormatted},
                COUNT(DISTINCT cpf_cnpj) as numero_acordos,
                COALESCE(SUM(valor_total), 0) as valor_total_cobrado
            FROM (
                SELECT 
                    cpf_cnpj,
                    DATE(data_emissao) as data_emissao,
                    SUM(valor_total) as valor_total
                FROM vuon_novacoes
                WHERE tipo = 'NOV'
                    AND atraso_real IS NOT NULL
                    AND ${acordosBlocoCondition}
                    AND DATE(data_emissao) >= '${startDate}'
                    AND DATE(data_emissao) <= '${endDate}'
                    ${agenteFilterNovacoes}
                GROUP BY cpf_cnpj, DATE(data_emissao)
            ) as acordos_agrupados
            GROUP BY ${acordosGroupBy}
            ORDER BY ${acordosOrderBy}
        `;

        // 3. Valor total cobrado (vuon_novacoes)
        // IMPORTANTE: Uma negociação tem entrada + parcelas, duplicando o CPF na tabela
        // Por isso agrupamos por CPF primeiro, somando todas as parcelas (entrada + parcelas) do mesmo CPF
        // Depois agrupamos por período (dia/semana/mês) para obter o valor total cobrado
        // Usa as mesmas cláusulas de agrupamento da query de acordos para consistência
        // Reutiliza agenteFilterNovacoes já definido acima
        // NOTA: NÃO filtra por atraso_real IS NOT NULL para incluir parcelas com atraso_real NULL
        const valorCobradoQuery = `
            SELECT 
                ${acordosDateSelect},
                ${acordosDateFormatted},
                COALESCE(SUM(valor_total_por_cpf), 0) as valor_total_cobrado
            FROM (
                SELECT 
                    cpf_cnpj,
                    DATE(data_emissao) as data_emissao,
                    SUM(valor_total) as valor_total_por_cpf
                FROM vuon_novacoes
                WHERE tipo = 'NOV'
                    AND ${acordosBlocoCondition}
                    AND DATE(data_emissao) >= '${startDate}'
                    AND DATE(data_emissao) <= '${endDate}'
                    ${agenteFilterNovacoes}
                GROUP BY cpf_cnpj, DATE(data_emissao)
            ) as acordos_agrupados_por_cpf
            GROUP BY ${acordosGroupBy}
            ORDER BY ${acordosOrderBy}
        `;

        // 4. Valor total recuperado (vuon_bordero_pagamento)
        // Query baseada na query fornecida pelo usuário, com filtro de bloco aplicado
        // Usa PagamentoModel.getBlocoCondition para aplicar o filtro de bloco
        // IMPORTANTE: Na tabela vuon_bordero_pagamento, a coluna 'agente' contém apenas o ID (não "ID - NOME")
        const pagamentosBlocoCondition = PagamentoModel.getBlocoCondition(bloco);
        
        // Filtro de agente para pagamentos (usa apenas o ID, não precisa formatar como "ID - NOME")
        let agenteFilterPagamentos = '';
        if (agenteId) {
            // Em vuon_bordero_pagamento, a coluna agente contém apenas o ID do agente
            agenteFilterPagamentos = `AND agente = '${agenteId}'`;
        }
        
        let pagamentosDateSelect, pagamentosDateFormatted, pagamentosGroupBy, pagamentosOrderBy;
        
        if (groupBy === 'month') {
            // Agrupamento por mês - EXATAMENTE como na query fornecida
            pagamentosDateSelect = `CONCAT(YEAR(data_pagamento), '-', LPAD(MONTH(data_pagamento), 2, '0'), '-01') AS date`;
            pagamentosDateFormatted = `DATE_FORMAT(CONCAT(YEAR(data_pagamento), '-', LPAD(MONTH(data_pagamento), 2, '0'), '-01'), '%m/%Y') AS date_formatted`;
            pagamentosGroupBy = `YEAR(data_pagamento), MONTH(data_pagamento)`;
            pagamentosOrderBy = `YEAR(data_pagamento), MONTH(data_pagamento)`;
        } else if (groupBy === 'week') {
            pagamentosDateSelect = `DATE_FORMAT(DATE_SUB(data_pagamento, INTERVAL WEEKDAY(data_pagamento) DAY), '%Y-%m-%d') as date`;
            pagamentosDateFormatted = `DATE_FORMAT(DATE_SUB(data_pagamento, INTERVAL WEEKDAY(data_pagamento) DAY), '%d/%m/%Y') as date_formatted`;
            pagamentosGroupBy = `YEAR(data_pagamento), WEEK(data_pagamento)`;
            pagamentosOrderBy = `YEAR(data_pagamento), WEEK(data_pagamento)`;
        } else {
            // day
            pagamentosDateSelect = `DATE(data_pagamento) as date`;
            pagamentosDateFormatted = `DATE_FORMAT(data_pagamento, '%d/%m/%Y') as date_formatted`;
            pagamentosGroupBy = `DATE(data_pagamento)`;
            pagamentosOrderBy = `DATE(data_pagamento)`;
        }
        
        // Query baseada na query fornecida pelo usuário, com filtro de bloco, período e agente aplicados
        const valorRecuperadoQuery = `
            SELECT 
                ${pagamentosDateSelect},
                ${pagamentosDateFormatted},
                COUNT(*) AS total_registros,
                COALESCE(SUM(valor_recebido), 0) AS valor_total_recuperado,
                COUNT(DISTINCT cpf_cnpj) AS cpfs_unicos
            FROM vuon_bordero_pagamento
            WHERE data_pagamento IS NOT NULL
                AND valor_recebido > 0
                AND ${pagamentosBlocoCondition}
                AND DATE(data_pagamento) >= '${startDate}'
                AND DATE(data_pagamento) <= '${endDate}'
                ${agenteFilterPagamentos}
            GROUP BY ${pagamentosGroupBy}
            ORDER BY ${pagamentosOrderBy}
        `;

        // Log das queries para debug
        console.log(`🔍 Comparativo - Executando queries para período ${startDate} até ${endDate}`);
        console.log(`   Bloco: ${bloco}, Clientes Virgens: ${clientesVirgens}, Agente: ${agenteId}, GroupBy: ${groupBy}`);
        console.log(`   Bloco Condition: ${blocoCondition}`);
        console.log(`   Acordos Bloco Condition: ${acordosBlocoCondition}`);
        console.log(`   Pagamentos Bloco Condition: ${pagamentosBlocoCondition}`);
        console.log(`   Agente Filter Novacoes: ${agenteFilterNovacoes || 'Nenhum'}`);
        console.log(`   Agente Filter Pagamentos: ${agenteFilterPagamentos || 'Nenhum'}`);
        
        // Verificar dados brutos em vuon_novacoes para o período
        try {
            const [novacoesTest] = await db.execute(`
                SELECT 
                    COUNT(*) as total_registros,
                    COUNT(DISTINCT cpf_cnpj) as total_cpfs,
                    SUM(valor_total) as soma_total_bruta,
                    MIN(data_emissao) as primeira_data,
                    MAX(data_emissao) as ultima_data
                FROM vuon_novacoes
                WHERE tipo = 'NOV'
                    AND atraso_real IS NOT NULL
                    AND ${acordosBlocoCondition}
                    AND DATE(data_emissao) >= '${startDate}'
                    AND DATE(data_emissao) <= '${endDate}'
                    ${agenteFilterNovacoes}
            `);
            console.log(`   📊 Dados brutos vuon_novacoes:`);
            console.log(`      Total registros: ${novacoesTest[0]?.total_registros || 0}`);
            console.log(`      Total CPFs únicos: ${novacoesTest[0]?.total_cpfs || 0}`);
            console.log(`      Soma total bruta (sem agrupar): R$ ${parseFloat(novacoesTest[0]?.soma_total_bruta || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
            console.log(`      Primeira data: ${novacoesTest[0]?.primeira_data || 'N/A'}`);
            console.log(`      Última data: ${novacoesTest[0]?.ultima_data || 'N/A'}`);
        } catch (error) {
            console.error(`   ⚠️ Erro ao verificar vuon_novacoes:`, error.message);
        }
        
        // Verificar se há dados no banco para o período
        try {
            const [testRows] = await db.execute(`
                SELECT COUNT(*) as total, MIN(DATE(data)) as min_date, MAX(DATE(data)) as max_date
                FROM vuon_resultados
                WHERE cpf_cnpj IS NOT NULL AND cpf_cnpj != ''
                LIMIT 1
            `);
            console.log(`   📊 Dados disponíveis no banco: ${testRows[0]?.total || 0} registros`);
            console.log(`   📅 Período dos dados: ${testRows[0]?.min_date || 'N/A'} até ${testRows[0]?.max_date || 'N/A'}`);
            
            // Verificar dados no período específico
            const [periodRows] = await db.execute(`
                SELECT COUNT(*) as total
                FROM vuon_resultados
                WHERE DATE(data) >= '${startDate}' AND DATE(data) <= '${endDate}'
                    AND cpf_cnpj IS NOT NULL AND cpf_cnpj != ''
            `);
            console.log(`   📊 Registros no período ${startDate} até ${endDate}: ${periodRows[0]?.total || 0}`);
        } catch (error) {
            console.error(`   ⚠️ Erro ao verificar dados:`, error.message);
        }
        
        // Executar todas as queries em paralelo
        let clientesRows, acordosRows, valorCobradoRows, valorRecuperadoRows;
        try {
            [clientesRows, acordosRows, valorCobradoRows, valorRecuperadoRows] = await Promise.all([
                db.execute(clientesCobradosQuery),
                db.execute(acordosQuery),
                db.execute(valorCobradoQuery),
                db.execute(valorRecuperadoQuery)
            ]);
            
            console.log(`✅ Comparativo - Queries executadas:`);
            console.log(`   Clientes: ${clientesRows[0].length} registros`);
            if (clientesRows[0].length > 0) {
                console.log(`   Primeiro registro clientes:`, clientesRows[0][0]);
            }
            console.log(`   Acordos: ${acordosRows[0].length} registros`);
            if (acordosRows[0].length > 0) {
                console.log(`   Primeiro registro acordos:`, acordosRows[0][0]);
            }
            console.log(`   Valor Cobrado: ${valorCobradoRows[0].length} registros`);
            if (valorCobradoRows[0].length > 0) {
                console.log(`   Primeiro registro valor cobrado:`, valorCobradoRows[0][0]);
                // Calcular total para debug
                const totalValorCobrado = valorCobradoRows[0].reduce((sum, row) => sum + parseFloat(row.valor_total_cobrado || 0), 0);
                console.log(`   📊 Total Valor Cobrado no período: R$ ${totalValorCobrado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
            }
            // Log da query para debug
            console.log(`   🔍 Query Valor Cobrado (primeiros 500 chars):`, valorCobradoQuery.substring(0, 500));
            console.log(`   Valor Recuperado: ${valorRecuperadoRows[0].length} registros`);
            if (valorRecuperadoRows[0].length > 0) {
                console.log(`   Primeiro registro valor recuperado:`, valorRecuperadoRows[0][0]);
                console.log(`   📊 Valores recuperados por período:`);
                valorRecuperadoRows[0].forEach((row, idx) => {
                    console.log(`      ${row.date_formatted || row.date}: R$ ${parseFloat(row.valor_total_recuperado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
                });
                const totalRecuperado = valorRecuperadoRows[0].reduce((sum, row) => sum + parseFloat(row.valor_total_recuperado || 0), 0);
                console.log(`   📊 Total Valor Recuperado no período: R$ ${totalRecuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
            }
            // Log da query para debug
            console.log(`   🔍 Query Valor Recuperado (primeiros 500 chars):`, valorRecuperadoQuery.substring(0, 500));
        } catch (error) {
            console.error(`❌ Comparativo - Erro ao executar queries:`, error);
            console.error(`   Query Clientes: ${clientesCobradosQuery.substring(0, 200)}...`);
            throw error;
        }

        // Criar mapas para facilitar a combinação
        const clientesMap = new Map();
        clientesRows[0].forEach(row => {
            const key = row.date_formatted || row.date;
            clientesMap.set(key, parseInt(row.clientes_unicos_cobrados || 0));
        });

        const acordosMap = new Map();
        acordosRows[0].forEach(row => {
            const key = row.date_formatted || row.date;
            acordosMap.set(key, parseInt(row.numero_acordos || 0));
        });

        const valorCobradoMap = new Map();
        valorCobradoRows[0].forEach(row => {
            const key = row.date_formatted || row.date;
            valorCobradoMap.set(key, parseFloat(row.valor_total_cobrado || 0));
        });

        const valorRecuperadoMap = new Map();
        valorRecuperadoRows[0].forEach(row => {
            const key = row.date_formatted || row.date;
            const valor = parseFloat(row.valor_total_recuperado || 0);
            valorRecuperadoMap.set(key, valor);
            console.log(`   📊 Valor Recuperado - Chave: "${key}", Valor: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        });
        console.log(`   📊 Total de chaves no valorRecuperadoMap: ${valorRecuperadoMap.size}`);

        // Coletar todas as datas únicas
        const allDates = new Set();
        clientesRows[0].forEach(row => allDates.add(row.date_formatted || row.date));
        acordosRows[0].forEach(row => allDates.add(row.date_formatted || row.date));
        valorCobradoRows[0].forEach(row => allDates.add(row.date_formatted || row.date));
        valorRecuperadoRows[0].forEach(row => allDates.add(row.date_formatted || row.date));

        // Combinar dados
        const dados = Array.from(allDates).sort().map(date => {
            const clientes = clientesMap.get(date) || 0;
            const acordos = acordosMap.get(date) || 0;
            const valorCobrado = valorCobradoMap.get(date) || 0;
            const valorRecuperado = valorRecuperadoMap.get(date) || 0;
            const percentAcordos = clientes > 0 ? parseFloat((acordos * 100.0 / clientes).toFixed(2)) : 0;
            const percentRecuperado = valorCobrado > 0 ? parseFloat((valorRecuperado * 100.0 / valorCobrado).toFixed(2)) : 0;

            // Debug: verificar se o valor recuperado está sendo encontrado
            if (groupBy === 'month') {
                console.log(`   🔍 Combinando dados para ${date}:`);
                console.log(`      - Clientes: ${clientes}`);
                console.log(`      - Acordos: ${acordos}`);
                console.log(`      - Valor Cobrado: R$ ${valorCobrado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
                console.log(`      - Valor Recuperado: R$ ${valorRecuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
                console.log(`      - Chaves disponíveis no valorRecuperadoMap:`, Array.from(valorRecuperadoMap.keys()));
            }

            return {
                date,
                clientes_unicos_cobrados: clientes,
                numero_acordos: acordos,
                percent_acordos: percentAcordos,
                valor_total_cobrado: valorCobrado,
                valor_total_recuperado: valorRecuperado,
                percent_valor_recuperado: percentRecuperado
            };
        });

        return dados;
    }

    /**
     * Função auxiliar para definir o bloco baseado em dias de atraso
     */
    static getBlocoCondition(bloco) {
        if (!bloco || bloco === 'all' || bloco === '' || bloco === null) {
            return '1=1';
        }
        // Converter string '1', '2', '3' para número se necessário
        const blocoNum = typeof bloco === 'string' && !isNaN(bloco) ? parseInt(bloco) : bloco;
        return BlocoModel.getBlocoCondition(blocoNum);
    }

    /**
     * Lista todos os agentes disponíveis
     */
    static async getAgentesList() {
        return await RecebimentoCobradorModel.getAgentesList();
    }

    /**
     * Busca dados de agentes por período para comparação
     */
    static async getDadosAgentesPorPeriodo(bloco, clientesVirgens, startDate, endDate) {
        const db = await getDB();
        
        const acordosBlocoCondition = NovacaoModel.getBlocoCondition(bloco);
        
        // Buscar dados de agentes: acordos e valores por agente
        // A tabela vuon_novacoes tem a coluna 'agente' (varchar), não agente_id
        const queryAgentes = `
            SELECT 
                agente,
                COUNT(DISTINCT cpf_cnpj) as total_acordos,
                COALESCE(SUM(valor_total_agrupado), 0) as valor_total_cobrado
            FROM (
                SELECT 
                    agente,
                    cpf_cnpj,
                    SUM(valor_total) as valor_total_agrupado
                FROM vuon_novacoes
                WHERE tipo = 'NOV'
                    AND atraso_real IS NOT NULL
                    AND ${acordosBlocoCondition}
                    AND DATE(data_emissao) >= '${startDate}'
                    AND DATE(data_emissao) <= '${endDate}'
                    AND agente IS NOT NULL
                    AND agente != ''
                    AND agente != '-'
                GROUP BY agente, cpf_cnpj
            ) as acordos_agrupados
            GROUP BY agente
            ORDER BY valor_total_cobrado DESC
            LIMIT 10
        `;
        
        const [agentesRows] = await db.execute(queryAgentes);
        
        return agentesRows.map(row => ({
            agente_nome: row.agente || 'Sem agente',
            total_acordos: parseInt(row.total_acordos || 0),
            valor_total_cobrado: parseFloat(row.valor_total_cobrado || 0)
        }));
    }

    /**
     * Busca o período disponível no banco de dados
     */
    static async getPeriodoDisponivel() {
        const db = await getDB();
        
        try {
            // Verificar período em vuon_resultados
            const [resultadosRows] = await db.execute(`
                SELECT 
                    MIN(DATE(data)) as min_date,
                    MAX(DATE(data)) as max_date,
                    COUNT(*) as total
                FROM vuon_resultados
                WHERE cpf_cnpj IS NOT NULL AND cpf_cnpj != ''
            `);
            
            // Verificar período em vuon_novacoes
            const [novacoesRows] = await db.execute(`
                SELECT 
                    MIN(DATE(data_emissao)) as min_date,
                    MAX(DATE(data_emissao)) as max_date,
                    COUNT(*) as total
                FROM vuon_novacoes
                WHERE tipo = 'NOV' AND atraso_real IS NOT NULL
            `);
            
            // Verificar período em recebimentos_por_cobrador
            const [recebimentosRows] = await db.execute(`
                SELECT 
                    MIN(DATE(data_pagamento)) as min_date,
                    MAX(DATE(data_pagamento)) as max_date,
                    COUNT(*) as total
                FROM recebimentos_por_cobrador
                WHERE data_pagamento IS NOT NULL AND valor_recebido IS NOT NULL
            `);
            
            return {
                vuon_resultados: resultadosRows[0] || null,
                vuon_novacoes: novacoesRows[0] || null,
                recebimentos_por_cobrador: recebimentosRows[0] || null
            };
        } catch (error) {
            console.error('Erro ao buscar período disponível:', error);
            return null;
        }
    }
}

module.exports = ComparativoModel;

