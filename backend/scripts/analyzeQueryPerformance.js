const { getDB } = require('../config/db');

/**
 * Script para analisar a performance das queries e sugerir otimizações
 */
const analyzeQueryPerformance = async () => {
    try {
        console.log('🔍 Analisando performance das queries...\n');
        
        const db = await getDB();
        console.log('✅ Database connection established\n');

        // Testar query otimizada vs query atual
        const bloco = 1;
        const startDate = '2025-10-01';
        const endDate = '2025-10-31';
        
        console.log(`📊 Testando Bloco ${bloco}, período: ${startDate} até ${endDate}\n`);

        // Query atual (lenta)
        console.log('⏱️  Testando query ATUAL (com COUNT DISTINCT)...');
        const start1 = Date.now();
        try {
            const [rows1] = await db.execute(`
                SELECT 
                    CONCAT(LPAD(MONTH(data), 2, '0'), '/', YEAR(data)) as date_formatted,
                    COUNT(DISTINCT CASE WHEN cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN cpf_cnpj END) as carteira,
                    COUNT(DISTINCT CASE WHEN acao IS NOT NULL AND acao != '' AND cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN cpf_cnpj END) as acionados
                FROM vuon_resultados
                WHERE atraso >= 61 AND atraso <= 90
                    AND data >= ? AND data <= ?
                GROUP BY YEAR(data), MONTH(data)
            `, [startDate, endDate]);
            const time1 = Date.now() - start1;
            console.log(`   ✅ Tempo: ${time1}ms`);
            console.log(`   📊 Resultados: ${rows1.length} meses\n`);
        } catch (error) {
            console.log(`   ❌ Erro: ${error.message}\n`);
        }

        // Query otimizada usando subquery (mais rápida)
        console.log('⏱️  Testando query OTIMIZADA (com subquery)...');
        const start2 = Date.now();
        try {
            const [rows2] = await db.execute(`
                SELECT 
                    CONCAT(LPAD(MONTH(data), 2, '0'), '/', YEAR(data)) as date_formatted,
                    COUNT(DISTINCT cpf_cnpj) as carteira,
                    COUNT(DISTINCT CASE WHEN acao IS NOT NULL AND acao != '' THEN cpf_cnpj END) as acionados
                FROM (
                    SELECT DISTINCT
                        data,
                        cpf_cnpj,
                        acao
                    FROM vuon_resultados
                    WHERE atraso >= 61 AND atraso <= 90
                        AND data >= ? AND data <= ?
                        AND cpf_cnpj IS NOT NULL 
                        AND cpf_cnpj != ''
                ) as subquery
                GROUP BY YEAR(data), MONTH(data)
            `, [startDate, endDate]);
            const time2 = Date.now() - start2;
            console.log(`   ✅ Tempo: ${time2}ms`);
            console.log(`   📊 Resultados: ${rows2.length} meses`);
            if (time1 && time2) {
                const improvement = ((time1 - time2) / time1 * 100).toFixed(1);
                console.log(`   🚀 Melhoria: ${improvement}% mais rápido\n`);
            }
        } catch (error) {
            console.log(`   ❌ Erro: ${error.message}\n`);
        }

        // Verificar índices existentes
        console.log('📊 Verificando índices existentes...\n');
        const [indexes] = await db.execute(`
            SELECT 
                INDEX_NAME,
                GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ', ') as columns
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'vuon_resultados'
            AND INDEX_NAME != 'PRIMARY'
            GROUP BY INDEX_NAME
            ORDER BY INDEX_NAME
        `);

        console.log(`   Encontrados ${indexes.length} índices:\n`);
        indexes.forEach(idx => {
            console.log(`   - ${idx.INDEX_NAME}: (${idx.columns})`);
        });

        // Verificar se há índices otimizados para nossas queries
        console.log('\n💡 Recomendações:\n');
        console.log('   1. Criar índice composto: (atraso, data, cpf_cnpj)');
        console.log('   2. Criar índice composto: (atraso, data, cpf_cnpj, acao)');
        console.log('   3. Considerar usar subqueries para reduzir o dataset antes do COUNT DISTINCT');
        console.log('   4. Executar ANALYZE TABLE para atualizar estatísticas\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
};

analyzeQueryPerformance();



