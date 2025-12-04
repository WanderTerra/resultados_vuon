const { getDB } = require('../config/db');
const BlocoModel = require('../models/blocoModel');

/**
 * Script para testar a performance das queries dos blocos após otimização
 */
const testBlocoPerformance = async () => {
    try {
        console.log('🚀 Testando performance das queries dos blocos...\n');
        
        const db = await getDB();
        console.log('✅ Database connection established\n');

        const blocks = [1, 2, 3, 'wo'];
        const results = [];

        // Teste 1: Mensal - Sem filtros (mais lento)
        console.log('='.repeat(70));
        console.log('📊 TESTE 1: Mensal - Sem filtros (query completa)');
        console.log('='.repeat(70));
        console.log('');

        for (const bloco of blocks) {
            console.log(`🧪 Bloco ${bloco}:`);
            const start = Date.now();
            try {
                const data = await BlocoModel.getBlocoData(bloco, null, null, 'month');
                const time = Date.now() - start;
                const timeSeconds = (time / 1000).toFixed(2);
                console.log(`   ✅ Sucesso! Tempo: ${timeSeconds}s (${time}ms)`);
                console.log(`   📊 Registros: ${data.acionadosXCarteira.length} meses`);
                results.push({ bloco, test: 'month_no_filters', time, timeSeconds, records: data.acionadosXCarteira.length, status: 'success' });
                
                if (time > 30000) {
                    console.log(`   🔴 MUITO LENTO (>30s)`);
                } else if (time > 10000) {
                    console.log(`   ⚠️  Lento (>10s)`);
                } else {
                    console.log(`   ✅ Performance OK`);
                }
            } catch (error) {
                const time = Date.now() - start;
                console.log(`   ❌ Erro: ${error.message}`);
                console.log(`   ⏱️  Tempo até erro: ${(time / 1000).toFixed(2)}s`);
                results.push({ bloco, test: 'month_no_filters', time, timeSeconds: (time / 1000).toFixed(2), records: 0, status: 'error', error: error.message });
            }
            console.log('');
        }

        // Teste 2: Mensal - Com filtros (deve ser mais rápido)
        console.log('='.repeat(70));
        console.log('📊 TESTE 2: Mensal - Com filtros (últimos 3 meses)');
        console.log('='.repeat(70));
        console.log('');

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2);
        const startDate = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

        for (const bloco of blocks) {
            console.log(`🧪 Bloco ${bloco} (${startDate} até ${endDate}):`);
            const start = Date.now();
            try {
                const data = await BlocoModel.getBlocoData(bloco, startDate, endDate, 'month');
                const time = Date.now() - start;
                const timeSeconds = (time / 1000).toFixed(2);
                console.log(`   ✅ Sucesso! Tempo: ${timeSeconds}s (${time}ms)`);
                console.log(`   📊 Registros: ${data.acionadosXCarteira.length} meses`);
                results.push({ bloco, test: 'month_with_filters', time, timeSeconds, records: data.acionadosXCarteira.length, status: 'success' });
                
                if (time > 10000) {
                    console.log(`   🔴 MUITO LENTO (>10s)`);
                } else if (time > 5000) {
                    console.log(`   ⚠️  Lento (>5s)`);
                } else {
                    console.log(`   ✅ Performance OK`);
                }
            } catch (error) {
                const time = Date.now() - start;
                console.log(`   ❌ Erro: ${error.message}`);
                console.log(`   ⏱️  Tempo até erro: ${(time / 1000).toFixed(2)}s`);
                results.push({ bloco, test: 'month_with_filters', time, timeSeconds: (time / 1000).toFixed(2), records: 0, status: 'error', error: error.message });
            }
            console.log('');
        }

        // Resumo
        console.log('='.repeat(70));
        console.log('📊 RESUMO DA PERFORMANCE');
        console.log('='.repeat(70));
        console.log('');

        const monthNoFilters = results.filter(r => r.test === 'month_no_filters' && r.status === 'success');
        const monthWithFilters = results.filter(r => r.test === 'month_with_filters' && r.status === 'success');

        if (monthNoFilters.length > 0) {
            const avg = (monthNoFilters.reduce((sum, r) => sum + r.time, 0) / monthNoFilters.length / 1000).toFixed(2);
            const min = (Math.min(...monthNoFilters.map(r => r.time)) / 1000).toFixed(2);
            const max = (Math.max(...monthNoFilters.map(r => r.time)) / 1000).toFixed(2);
            console.log('📋 Mensal - Sem filtros:');
            console.log(`   Média: ${avg}s`);
            console.log(`   Mínimo: ${min}s`);
            console.log(`   Máximo: ${max}s`);
            monthNoFilters.forEach(r => {
                console.log(`   Bloco ${r.bloco}: ${r.timeSeconds}s ${r.time > 30000 ? '🔴' : r.time > 10000 ? '⚠️' : '✅'}`);
            });
            console.log('');
        }

        if (monthWithFilters.length > 0) {
            const avg = (monthWithFilters.reduce((sum, r) => sum + r.time, 0) / monthWithFilters.length / 1000).toFixed(2);
            const min = (Math.min(...monthWithFilters.map(r => r.time)) / 1000).toFixed(2);
            const max = (Math.max(...monthWithFilters.map(r => r.time)) / 1000).toFixed(2);
            console.log('📋 Mensal - Com filtros:');
            console.log(`   Média: ${avg}s`);
            console.log(`   Mínimo: ${min}s`);
            console.log(`   Máximo: ${max}s`);
            monthWithFilters.forEach(r => {
                console.log(`   Bloco ${r.bloco}: ${r.timeSeconds}s ${r.time > 10000 ? '🔴' : r.time > 5000 ? '⚠️' : '✅'}`);
            });
            console.log('');
        }

        // Verificar uso de índices
        console.log('='.repeat(70));
        console.log('📊 Verificando uso de índices...');
        console.log('='.repeat(70));
        console.log('');

        try {
            const [explainResult] = await db.execute(`
                EXPLAIN SELECT 
                    CONCAT(LPAD(MONTH(data), 2, '0'), '/', YEAR(data)) as date_formatted,
                    COUNT(DISTINCT CASE WHEN cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN cpf_cnpj END) as carteira,
                    COUNT(DISTINCT CASE WHEN acao IS NOT NULL AND acao != '' AND cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN cpf_cnpj END) as acionados
                FROM vuon_resultados
                WHERE atraso >= 61 AND atraso <= 90
                    AND data >= '2025-10-01' AND data <= '2025-10-31'
                GROUP BY YEAR(data), MONTH(data)
            `);

            console.log('   EXPLAIN da query:');
            explainResult.forEach(row => {
                console.log(`   - key: ${row.key || 'NULL'}, rows: ${row.rows}, type: ${row.type}`);
                if (row.key && row.key.includes('idx_')) {
                    console.log(`     ✅ Usando índice: ${row.key}`);
                } else if (row.type === 'ALL') {
                    console.log(`     ⚠️  Full table scan (sem índice)`);
                }
            });
        } catch (error) {
            console.log(`   ⚠️  Erro ao verificar índices: ${error.message}`);
        }

        console.log('\n✅ Teste concluído!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Erro durante o teste:', error);
        process.exit(1);
    }
};

testBlocoPerformance();

