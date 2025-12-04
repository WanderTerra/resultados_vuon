const { getDB } = require('../config/db');

const createViews = async () => {
    try {
        console.log('🔍 Criando views para otimização de consultas...\n');
        
        const db = await getDB();
        
        // View 1: Acordos agrupados por CPF, mês e bloco
        // Agrupa acordos da tabela vuon_novacoes, somando valores de parcelas do mesmo CPF
        console.log('📊 Criando view: vw_acordos_por_bloco_mes...');
        await db.execute(`
            CREATE OR REPLACE VIEW vw_acordos_por_bloco_mes AS
            SELECT 
                CONCAT(YEAR(DATE(data_emissao)), '-', LPAD(MONTH(DATE(data_emissao)), 2, '0')) as date_key,
                CONCAT(LPAD(MONTH(DATE(data_emissao)), 2, '0'), '/', YEAR(DATE(data_emissao))) as date_formatted,
                CAST(CASE 
                    WHEN atraso_real >= 61 AND atraso_real <= 90 THEN '1'
                    WHEN atraso_real >= 91 AND atraso_real <= 180 THEN '2'
                    WHEN atraso_real >= 181 AND atraso_real <= 360 THEN '3'
                    WHEN atraso_real >= 360 AND atraso_real <= 9999 THEN 'wo'
                    ELSE NULL
                END AS CHAR) as bloco,
                COUNT(DISTINCT cpf_cnpj) as total_acordos,
                COALESCE(SUM(valor_total), 0) as valor_total
            FROM vuon_novacoes
            WHERE tipo = 'NOV'
                AND atraso_real IS NOT NULL
            GROUP BY 
                YEAR(DATE(data_emissao)), 
                MONTH(DATE(data_emissao)),
                CAST(CASE 
                    WHEN atraso_real >= 61 AND atraso_real <= 90 THEN '1'
                    WHEN atraso_real >= 91 AND atraso_real <= 180 THEN '2'
                    WHEN atraso_real >= 181 AND atraso_real <= 360 THEN '3'
                    WHEN atraso_real >= 360 AND atraso_real <= 9999 THEN 'wo'
                    ELSE NULL
                END AS CHAR)
        `);
        console.log('✅ View vw_acordos_por_bloco_mes criada!\n');
        
        // View 2: Pagamentos agrupados por CPF, mês e bloco
        // Agrupa pagamentos da tabela vuon_bordero_pagamento
        console.log('📊 Criando view: vw_pagamentos_por_bloco_mes...');
        await db.execute(`
            CREATE OR REPLACE VIEW vw_pagamentos_por_bloco_mes AS
            SELECT 
                CONCAT(YEAR(DATE(data_pagamento)), '-', LPAD(MONTH(DATE(data_pagamento)), 2, '0')) as date_key,
                CONCAT(LPAD(MONTH(DATE(data_pagamento)), 2, '0'), '/', YEAR(DATE(data_pagamento))) as date_formatted,
                CAST(CASE 
                    WHEN (atraso_real >= 61 AND atraso_real <= 90) OR (atraso_real IS NULL AND atraso >= 61 AND atraso <= 90) THEN '1'
                    WHEN (atraso_real >= 91 AND atraso_real <= 180) OR (atraso_real IS NULL AND atraso >= 91 AND atraso <= 180) THEN '2'
                    WHEN (atraso_real >= 181 AND atraso_real <= 360) OR (atraso_real IS NULL AND atraso >= 181 AND atraso <= 360) THEN '3'
                    WHEN (atraso_real >= 360 AND atraso_real <= 9999) OR (atraso_real IS NULL AND atraso >= 360 AND atraso <= 9999) THEN 'wo'
                    ELSE NULL
                END AS CHAR) as bloco,
                COUNT(DISTINCT cpf_cnpj) as quantidade_pagamentos,
                COALESCE(SUM(valor_recebido), 0) as valor_recebido_total
            FROM vuon_bordero_pagamento
            WHERE data_pagamento IS NOT NULL
                AND valor_recebido > 0
            GROUP BY 
                YEAR(DATE(data_pagamento)), 
                MONTH(DATE(data_pagamento)),
                CAST(CASE 
                    WHEN (atraso_real >= 61 AND atraso_real <= 90) OR (atraso_real IS NULL AND atraso >= 61 AND atraso <= 90) THEN '1'
                    WHEN (atraso_real >= 91 AND atraso_real <= 180) OR (atraso_real IS NULL AND atraso >= 91 AND atraso <= 180) THEN '2'
                    WHEN (atraso_real >= 181 AND atraso_real <= 360) OR (atraso_real IS NULL AND atraso >= 181 AND atraso <= 360) THEN '3'
                    WHEN (atraso_real >= 360 AND atraso_real <= 9999) OR (atraso_real IS NULL AND atraso >= 360 AND atraso <= 9999) THEN 'wo'
                    ELSE NULL
                END AS CHAR)
        `);
        console.log('✅ View vw_pagamentos_por_bloco_mes criada!\n');
        
        // View 3: Dados de produção agrupados por mês e bloco
        // Agrupa dados da tabela vuon_resultados para os gráficos principais
        console.log('📊 Criando view: vw_producao_por_bloco_mes...');
        await db.execute(`
            CREATE OR REPLACE VIEW vw_producao_por_bloco_mes AS
            SELECT 
                CONCAT(YEAR(data), '-', LPAD(MONTH(data), 2, '0')) as date_key,
                CONCAT(LPAD(MONTH(data), 2, '0'), '/', YEAR(data)) as date_formatted,
                CAST(CASE 
                    WHEN atraso >= 61 AND atraso <= 90 THEN '1'
                    WHEN atraso >= 91 AND atraso <= 180 THEN '2'
                    WHEN atraso >= 181 AND atraso <= 360 THEN '3'
                    WHEN atraso >= 360 AND atraso <= 9999 THEN 'wo'
                    ELSE NULL
                END AS CHAR) as bloco,
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
                -- Recebimento
                COALESCE(SUM(CASE WHEN valor > 0 THEN valor ELSE 0 END), 0) as recebimento
            FROM vuon_resultados
            GROUP BY 
                YEAR(data), 
                MONTH(data),
                CAST(CASE 
                    WHEN atraso >= 61 AND atraso <= 90 THEN '1'
                    WHEN atraso >= 91 AND atraso <= 180 THEN '2'
                    WHEN atraso >= 181 AND atraso <= 360 THEN '3'
                    WHEN atraso >= 360 AND atraso <= 9999 THEN 'wo'
                    ELSE NULL
                END AS CHAR)
        `);
        console.log('✅ View vw_producao_por_bloco_mes criada!\n');
        
        console.log('✅ Todas as views criadas com sucesso!');
        console.log('\n📋 Views disponíveis:');
        console.log('   - vw_acordos_por_bloco_mes');
        console.log('   - vw_pagamentos_por_bloco_mes');
        console.log('   - vw_producao_por_bloco_mes');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao criar views:', error.message);
        if (error.code === 'ER_TABLE_EXISTS') {
            console.log('ℹ️  Algumas views já existem. Use CREATE OR REPLACE VIEW.');
        }
        process.exit(1);
    }
};

createViews();

