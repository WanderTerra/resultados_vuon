const { getDB } = require('../config/db');

const createBlocoViews = async () => {
    try {
        console.log('🔍 Creating database views for bloco cards optimization...');
        
        const db = await getDB();
        console.log('✅ Database connection established\n');

        // Views para cada bloco (1, 2, 3, WO)
        // Para vuon_resultados (usar 'atraso')
        const blocosResultados = [
            { name: '1', condition: 'atraso >= 61 AND atraso <= 90' },
            { name: '2', condition: 'atraso >= 91 AND atraso <= 180' },
            { name: '3', condition: 'atraso >= 181 AND atraso <= 360' },
            { name: 'wo', condition: 'atraso >= 360 AND atraso <= 9999' }
        ];
        
        // Para vuon_novacoes (usar 'atraso_real')
        const blocosNovacoes = [
            { name: '1', condition: 'atraso_real >= 61 AND atraso_real <= 90' },
            { name: '2', condition: 'atraso_real >= 91 AND atraso_real <= 180' },
            { name: '3', condition: 'atraso_real >= 181 AND atraso_real <= 360' },
            { name: 'wo', condition: 'atraso_real >= 360 AND atraso_real <= 9999' }
        ];
        
        // Usar blocosResultados para views agregadas (vuon_resultados)
        const blocos = blocosResultados;

        // View principal que agrega todos os dados por bloco e data
        // Esta view pré-computa todas as métricas necessárias
        const views = [];

        for (const bloco of blocos) {
            const viewName = `v_bloco${bloco.name}_agregado`;
            
            views.push({
                name: viewName,
                query: `
                    CREATE OR REPLACE VIEW ${viewName} AS
                    SELECT 
                        DATE(data) as data,
                        YEAR(data) as ano,
                        MONTH(data) as mes,
                        CONCAT(YEAR(data), '-', LPAD(MONTH(data), 2, '0')) as date_month,
                        CONCAT(LPAD(MONTH(data), 2, '0'), '/', YEAR(data)) as date_formatted,
                        -- Acionados x Carteira
                        COUNT(*) as carteira,
                        SUM(acao IS NOT NULL AND acao != '') as acionados,
                        -- Acionados x Alô
                        SUM(agente != '0' AND agente IS NOT NULL AND agente != '') as alo,
                        -- Alô x CPC
                        SUM(
                            agente != '0' 
                            AND agente IS NOT NULL 
                            AND agente != ''
                            AND acao IN ('EIO', 'CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'APC', 'JUR', 'DDA')
                        ) as cpc,
                        -- CPC x CPCA
                        SUM(
                            agente != '0' 
                            AND agente IS NOT NULL 
                            AND agente != ''
                            AND acao IN ('CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'JUR', 'DDA')
                        ) as cpca,
                        -- CPCA x Acordos (DDA apenas)
                        SUM(
                            agente != '0' 
                            AND agente IS NOT NULL 
                            AND agente != ''
                            AND acao = 'DDA'
                        ) as acordos_resultados,
                        -- Acordos x Pagamentos (valor > 0)
                        SUM(
                            agente != '0' 
                            AND agente IS NOT NULL 
                            AND agente != ''
                            AND valor > 0
                        ) as pgto_resultados,
                        -- Spins (códigos únicos)
                        COUNT(DISTINCT codigo) as spins,
                        -- Recebimento
                        COALESCE(SUM(CASE WHEN valor > 0 THEN valor ELSE 0 END), 0) as recebimento
                    FROM vuon_resultados
                    WHERE ${bloco.condition}
                    GROUP BY DATE(data), YEAR(data), MONTH(data)
                    ORDER BY data ASC
                    -- OTIMIZAÇÃO: Esta view será recalculada a cada consulta
                    -- Garanta que os índices idx_atraso_data e idx_data estejam criados
                `
            });
        }

        // View para acordos por bloco (de vuon_novacoes)
        // IMPORTANTE: Conta acordos únicos por CPF (cliente), não todos os registros
        // Filtra apenas acordos de agentes (exclui "-" e "899 - SUPORTE")
        for (const bloco of blocosNovacoes) {
            const viewName = `v_bloco${bloco.name}_acordos`;
            
            views.push({
                name: viewName,
                query: `
                    CREATE OR REPLACE VIEW ${viewName} AS
                    SELECT 
                        DATE(data_emissao) as data,
                        YEAR(data_emissao) as ano,
                        MONTH(data_emissao) as mes,
                        CONCAT(YEAR(data_emissao), '-', LPAD(MONTH(data_emissao), 2, '0')) as date_month,
                        CONCAT(LPAD(MONTH(data_emissao), 2, '0'), '/', YEAR(data_emissao)) as date_formatted,
                        COUNT(DISTINCT cpf_cnpj) as total_acordos
                    FROM vuon_novacoes
                    WHERE ${bloco.condition}
                        AND atraso_real IS NOT NULL
                        AND agente IS NOT NULL
                        AND agente != ''
                        AND agente != '-'
                        AND agente != '899 - SUPORTE'
                        AND cpf_cnpj IS NOT NULL
                        AND cpf_cnpj != ''
                    GROUP BY DATE(data_emissao), YEAR(data_emissao), MONTH(data_emissao)
                    ORDER BY data ASC
                    -- OTIMIZAÇÃO: Esta view será recalculada a cada consulta
                    -- Garanta que os índices idx_novacoes_atraso_data e idx_novacoes_agente_atraso estejam criados
                `
            });
        }

        // View para pagamentos por bloco (de vuon_bordero_pagamento)
        // IMPORTANTE: Filtra pagamentos por bloco usando atraso_real/atraso
        // Apenas pagamentos de acordos feitos por agentes (agente != '0')
        // Lógica: Acordos do mês X do bloco Y vs Pagamentos do mês X do bloco Y
        for (const bloco of blocos) {
            const viewName = `v_bloco${bloco.name}_pagamentos`;
            
            // Definir condição de bloco baseada em atraso_real ou atraso do pagamento
            let atrasoCondition;
            if (bloco.name === 'wo') {
                atrasoCondition = `((bp.atraso_real >= 360 AND bp.atraso_real <= 9999) OR (bp.atraso_real IS NULL AND bp.atraso >= 360 AND bp.atraso <= 9999))`;
            } else if (bloco.name === '1') {
                atrasoCondition = `((bp.atraso_real >= 61 AND bp.atraso_real <= 90) OR (bp.atraso_real IS NULL AND bp.atraso >= 61 AND bp.atraso <= 90))`;
            } else if (bloco.name === '2') {
                atrasoCondition = `((bp.atraso_real >= 91 AND bp.atraso_real <= 180) OR (bp.atraso_real IS NULL AND bp.atraso >= 91 AND bp.atraso <= 180))`;
            } else { // bloco 3
                atrasoCondition = `((bp.atraso_real >= 181 AND bp.atraso_real <= 360) OR (bp.atraso_real IS NULL AND bp.atraso >= 181 AND bp.atraso <= 360))`;
            }
            
            views.push({
                name: viewName,
                query: `
                    CREATE OR REPLACE VIEW ${viewName} AS
                    SELECT 
                        DATE(bp.data_pagamento) as data,
                        YEAR(bp.data_pagamento) as ano,
                        MONTH(bp.data_pagamento) as mes,
                        CONCAT(YEAR(bp.data_pagamento), '-', LPAD(MONTH(bp.data_pagamento), 2, '0')) as date_month,
                        CONCAT(LPAD(MONTH(bp.data_pagamento), 2, '0'), '/', YEAR(bp.data_pagamento)) as date_formatted,
                        COUNT(*) as quantidade_pagamentos,
                        COALESCE(SUM(bp.valor_recebido), 0) as valor_total
                    FROM vuon_bordero_pagamento bp
                    INNER JOIN (
                        SELECT DISTINCT cpf_cnpj
                        FROM vuon_novacoes
                        WHERE atraso_real IS NOT NULL
                            AND agente IS NOT NULL
                            AND agente != ''
                            AND agente != '-'
                            AND agente != '899 - SUPORTE'
                            AND cpf_cnpj IS NOT NULL
                            AND cpf_cnpj != ''
                    ) acordos_agentes ON bp.cpf_cnpj = acordos_agentes.cpf_cnpj
                    WHERE bp.data_pagamento IS NOT NULL
                        AND ${atrasoCondition}
                    GROUP BY DATE(bp.data_pagamento), YEAR(bp.data_pagamento), MONTH(bp.data_pagamento)
                    ORDER BY data ASC
                `
            });
        }

        console.log(`📊 Creating ${views.length} views...\n`);

        let created = 0;
        let errors = 0;

        for (const view of views) {
            try {
                console.log(`⏳ Creating view ${view.name}...`);
                await db.execute(view.query);
                console.log(`✅ View created: ${view.name}`);
                created++;
            } catch (error) {
                console.log(`⚠️  Could not create view ${view.name}: ${error.message}`);
                errors++;
            }
        }

        console.log(`\n📊 Summary: ${created} views created, ${errors} errors`);
        console.log('✅ View creation completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating views:', error);
        process.exit(1);
    }
};

createBlocoViews();

