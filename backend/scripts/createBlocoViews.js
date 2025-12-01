const { getDB } = require('../config/db');

const createBlocoViews = async () => {
    try {
        console.log('🔍 Creating database views for bloco cards optimization...');
        
        const db = await getDB();
        console.log('✅ Database connection established\n');

        // Views para cada bloco (1, 2, 3, WO)
        const blocos = [
            { name: '1', condition: 'atraso >= 61 AND atraso <= 90' },
            { name: '2', condition: 'atraso >= 91 AND atraso <= 180' },
            { name: '3', condition: 'atraso >= 181 AND atraso <= 360' },
            { name: 'wo', condition: 'atraso >= 360 AND atraso <= 9999' }
        ];

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
                        -- CPCA x Acordos (ACD)
                        SUM(
                            agente != '0' 
                            AND agente IS NOT NULL 
                            AND agente != ''
                            AND acao = 'ACD'
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
                `
            });
        }

        // View para acordos por bloco (de vuon_novacoes)
        for (const bloco of blocos) {
            const viewName = `v_bloco${bloco.name}_acordos`;
            const atrasoCondition = bloco.name === 'wo' 
                ? 'atraso_real >= 360 AND atraso_real <= 9999'
                : bloco.name === '1'
                ? 'atraso_real >= 61 AND atraso_real <= 90'
                : bloco.name === '2'
                ? 'atraso_real >= 91 AND atraso_real <= 180'
                : 'atraso_real >= 181 AND atraso_real <= 360';
            
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
                        COUNT(*) as total_acordos
                    FROM vuon_novacoes
                    WHERE ${atrasoCondition}
                    GROUP BY DATE(data_emissao), YEAR(data_emissao), MONTH(data_emissao)
                    ORDER BY data ASC
                `
            });
        }

        // View para pagamentos por bloco (de vuon_bordero_pagamento)
        for (const bloco of blocos) {
            const viewName = `v_bloco${bloco.name}_pagamentos`;
            const atrasoCondition = bloco.name === 'wo' 
                ? 'COALESCE(atraso_real, atraso) >= 360 AND COALESCE(atraso_real, atraso) <= 9999'
                : bloco.name === '1'
                ? 'COALESCE(atraso_real, atraso) >= 61 AND COALESCE(atraso_real, atraso) <= 90'
                : bloco.name === '2'
                ? 'COALESCE(atraso_real, atraso) >= 91 AND COALESCE(atraso_real, atraso) <= 180'
                : 'COALESCE(atraso_real, atraso) >= 181 AND COALESCE(atraso_real, atraso) <= 360';
            
            views.push({
                name: viewName,
                query: `
                    CREATE OR REPLACE VIEW ${viewName} AS
                    SELECT 
                        DATE(data_pagamento) as data,
                        YEAR(data_pagamento) as ano,
                        MONTH(data_pagamento) as mes,
                        CONCAT(YEAR(data_pagamento), '-', LPAD(MONTH(data_pagamento), 2, '0')) as date_month,
                        CONCAT(LPAD(MONTH(data_pagamento), 2, '0'), '/', YEAR(data_pagamento)) as date_formatted,
                        COUNT(*) as quantidade_pagamentos,
                        COALESCE(SUM(valor_recebido), 0) as valor_total
                    FROM vuon_bordero_pagamento
                    WHERE ${atrasoCondition}
                    GROUP BY DATE(data_pagamento), YEAR(data_pagamento), MONTH(data_pagamento)
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

