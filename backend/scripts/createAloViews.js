const { getDB } = require('../config/db');

const createAloViews = async () => {
    try {
        console.log('🔍 Creating database views for ALO/CPC/CPCA optimization...');
        
        const db = await getDB();
        console.log('✅ Database connection established\n');

        const views = [
            // View para resumo ALO agregado por data
            {
                name: 'v_alo_agregado',
                query: `
                    CREATE OR REPLACE VIEW v_alo_agregado AS
                    SELECT 
                        DATE(data) as data,
                        YEAR(data) as ano,
                        MONTH(data) as mes,
                        CONCAT(YEAR(data), '-', LPAD(MONTH(data), 2, '0')) as date_month,
                        CONCAT(LPAD(MONTH(data), 2, '0'), '/', YEAR(data)) as date_formatted,
                        COUNT(*) as total_alo,
                        COUNT(DISTINCT acao) as total_acoes,
                        COUNT(DISTINCT nome) as total_clientes,
                        -- CPC: ações com agente (EIO, CSA, ACD, SCP, APH, DEF, SRP, APC, JUR, DDA)
                        SUM(
                            agente != '0' 
                            AND agente IS NOT NULL 
                            AND agente != ''
                            AND acao IN ('EIO', 'CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'APC', 'JUR', 'DDA')
                        ) as cpc,
                        -- CPCA: ações CPCA (CSA, ACD, SCP, APH, DEF, SRP, JUR, DDA)
                        SUM(
                            agente != '0' 
                            AND agente IS NOT NULL 
                            AND agente != ''
                            AND acao IN ('CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'JUR', 'DDA')
                        ) as cpca
                    FROM vuon_resultados
                    WHERE agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                    GROUP BY DATE(data), YEAR(data), MONTH(data)
                    ORDER BY data ASC
                `
            },
            
            // View para ações com totais e percentuais
            {
                name: 'v_alo_acoes',
                query: `
                    CREATE OR REPLACE VIEW v_alo_acoes AS
                    SELECT 
                        acao,
                        COUNT(*) as total,
                        COUNT(*) * 100.0 / (
                            SELECT COUNT(*) 
                            FROM vuon_resultados 
                            WHERE agente != '0' 
                                AND agente IS NOT NULL 
                                AND agente != ''
                        ) as percentual
                    FROM vuon_resultados
                    WHERE agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                        AND acao IS NOT NULL
                        AND LENGTH(acao) = 3
                    GROUP BY acao
                    ORDER BY total DESC
                `
            },
            
            // View para CPC e CPCA por data (otimizada)
            {
                name: 'v_cpc_cpca_por_data',
                query: `
                    CREATE OR REPLACE VIEW v_cpc_cpca_por_data AS
                    SELECT 
                        DATE(data) as data,
                        YEAR(data) as ano,
                        MONTH(data) as mes,
                        CONCAT(YEAR(data), '-', LPAD(MONTH(data), 2, '0')) as date_month,
                        CONCAT(LPAD(MONTH(data), 2, '0'), '/', YEAR(data)) as date_formatted,
                        SUM(acao IN ('EIO', 'CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'APC', 'JUR', 'DDA')) as cpc,
                        SUM(acao IN ('CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'JUR', 'DDA')) as cpca
                    FROM vuon_resultados
                    WHERE agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                        AND acao IS NOT NULL
                    GROUP BY DATE(data), YEAR(data), MONTH(data)
                    ORDER BY data ASC
                `
            },
            
            // View para resumo geral ALO (totalizadores)
            {
                name: 'v_alo_resumo',
                query: `
                    CREATE OR REPLACE VIEW v_alo_resumo AS
                    SELECT 
                        COUNT(*) as total_alo,
                        COUNT(DISTINCT acao) as total_acoes,
                        COUNT(DISTINCT nome) as total_clientes,
                        MIN(data) as data_inicio,
                        MAX(data) as data_fim,
                        SUM(acao IN ('EIO', 'CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'APC', 'JUR', 'DDA')) as total_cpc,
                        SUM(acao IN ('CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'JUR', 'DDA')) as total_cpca
                    FROM vuon_resultados
                    WHERE agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                `
            }
        ];

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

createAloViews();

