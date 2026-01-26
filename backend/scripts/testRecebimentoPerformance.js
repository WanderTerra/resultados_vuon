const { getDB } = require('../config/db');
const PagamentoModel = require('../models/pagamentoModel');

async function testRecebimentoPerformance() {
    console.log('🚀 Testando performance de recebimento diário e com filtros...\n');
    
    try {
        const db = await getDB();
        console.log('✅ Database connection established\n');
        
        const results = [];
        
        // ======================================================================
        // TESTE 1: Recebimento Mensal - Sem filtros
        // ======================================================================
        console.log('======================================================================');
        console.log('📊 TESTE 1: Recebimento Mensal - Sem filtros');
        console.log('======================================================================\n');
        
        const test1Start = Date.now();
        try {
            const [recebimento1, recebimento2, recebimento3, recebimentoWO] = await Promise.all([
                PagamentoModel.getRecebimentoData(1, null, null, 'month'),
                PagamentoModel.getRecebimentoData(2, null, null, 'month'),
                PagamentoModel.getRecebimentoData(3, null, null, 'month'),
                PagamentoModel.getRecebimentoData('wo', null, null, 'month')
            ]);
            
            const test1Time = Date.now() - test1Start;
            console.log(`   ✅ Sucesso! Tempo: ${(test1Time / 1000).toFixed(2)}s (${test1Time}ms)`);
            console.log(`   📊 Bloco 1: ${recebimento1.porMes.length} meses`);
            console.log(`   📊 Bloco 2: ${recebimento2.porMes.length} meses`);
            console.log(`   📊 Bloco 3: ${recebimento3.porMes.length} meses`);
            console.log(`   📊 WO: ${recebimentoWO.porMes.length} meses`);
            
            if (test1Time > 10000) {
                console.log(`   🔴 MUITO LENTO (>10s)`);
            } else if (test1Time > 5000) {
                console.log(`   ⚠️  Lento (>5s)`);
            } else {
                console.log(`   ✅ Rápido (<5s)`);
            }
            
            results.push({ test: 'Mensal - Sem filtros', time: test1Time, status: 'success' });
        } catch (error) {
            const test1Time = Date.now() - test1Start;
            console.log(`   ❌ Erro: ${error.message}`);
            results.push({ test: 'Mensal - Sem filtros', time: test1Time, status: 'error', error: error.message });
        }
        
        // ======================================================================
        // TESTE 2: Recebimento Mensal - Com filtros (últimos 3 meses)
        // ======================================================================
        console.log('\n======================================================================');
        console.log('📊 TESTE 2: Recebimento Mensal - Com filtros (últimos 3 meses)');
        console.log('======================================================================\n');
        
        const startDate = '2025-10-01';
        const endDate = '2025-12-31';
        
        const test2Start = Date.now();
        try {
            const [recebimento1, recebimento2, recebimento3, recebimentoWO] = await Promise.all([
                PagamentoModel.getRecebimentoData(1, startDate, endDate, 'month'),
                PagamentoModel.getRecebimentoData(2, startDate, endDate, 'month'),
                PagamentoModel.getRecebimentoData(3, startDate, endDate, 'month'),
                PagamentoModel.getRecebimentoData('wo', startDate, endDate, 'month')
            ]);
            
            const test2Time = Date.now() - test2Start;
            console.log(`   ✅ Sucesso! Tempo: ${(test2Time / 1000).toFixed(2)}s (${test2Time}ms)`);
            console.log(`   📊 Bloco 1: ${recebimento1.porMes.length} meses`);
            console.log(`   📊 Bloco 2: ${recebimento2.porMes.length} meses`);
            console.log(`   📊 Bloco 3: ${recebimento3.porMes.length} meses`);
            console.log(`   📊 WO: ${recebimentoWO.porMes.length} meses`);
            
            if (test2Time > 10000) {
                console.log(`   🔴 MUITO LENTO (>10s)`);
            } else if (test2Time > 5000) {
                console.log(`   ⚠️  Lento (>5s)`);
            } else {
                console.log(`   ✅ Rápido (<5s)`);
            }
            
            results.push({ test: 'Mensal - Com filtros', time: test2Time, status: 'success' });
        } catch (error) {
            const test2Time = Date.now() - test2Start;
            console.log(`   ❌ Erro: ${error.message}`);
            results.push({ test: 'Mensal - Com filtros', time: test2Time, status: 'error', error: error.message });
        }
        
        // ======================================================================
        // TESTE 3: Recebimento Diário - Um mês específico
        // ======================================================================
        console.log('\n======================================================================');
        console.log('📊 TESTE 3: Recebimento Diário - Um mês específico (Outubro 2025)');
        console.log('======================================================================\n');
        
        const monthStart = '2025-10-01';
        const monthEnd = '2025-10-31';
        
        const test3Start = Date.now();
        try {
            const [recebimento1, recebimento2, recebimento3, recebimentoWO] = await Promise.all([
                PagamentoModel.getRecebimentoData(1, monthStart, monthEnd, 'day'),
                PagamentoModel.getRecebimentoData(2, monthStart, monthEnd, 'day'),
                PagamentoModel.getRecebimentoData(3, monthStart, monthEnd, 'day'),
                PagamentoModel.getRecebimentoData('wo', monthStart, monthEnd, 'day')
            ]);
            
            const test3Time = Date.now() - test3Start;
            console.log(`   ✅ Sucesso! Tempo: ${(test3Time / 1000).toFixed(2)}s (${test3Time}ms)`);
            console.log(`   📊 Bloco 1: ${recebimento1.porDia.length} dias`);
            console.log(`   📊 Bloco 2: ${recebimento2.porDia.length} dias`);
            console.log(`   📊 Bloco 3: ${recebimento3.porDia.length} dias`);
            console.log(`   📊 WO: ${recebimentoWO.porDia.length} dias`);
            
            if (test3Time > 10000) {
                console.log(`   🔴 MUITO LENTO (>10s)`);
            } else if (test3Time > 5000) {
                console.log(`   ⚠️  Lento (>5s)`);
            } else {
                console.log(`   ✅ Rápido (<5s)`);
            }
            
            results.push({ test: 'Diário - Um mês', time: test3Time, status: 'success' });
        } catch (error) {
            const test3Time = Date.now() - test3Start;
            console.log(`   ❌ Erro: ${error.message}`);
            results.push({ test: 'Diário - Um mês', time: test3Time, status: 'error', error: error.message });
        }
        
        // ======================================================================
        // RESUMO FINAL
        // ======================================================================
        console.log('\n======================================================================');
        console.log('📊 RESUMO FINAL - RECEBIMENTO');
        console.log('======================================================================\n');
        
        const totalTime = results.reduce((sum, r) => sum + r.time, 0);
        const successCount = results.filter(r => r.status === 'success').length;
        const errorCount = results.filter(r => r.status === 'error').length;
        
        results.forEach(result => {
            const statusIcon = result.status === 'success' ? '✅' : '❌';
            const timeStr = `${(result.time / 1000).toFixed(2)}s`;
            let performance = '';
            
            if (result.time > 10000) {
                performance = '🔴 MUITO LENTO';
            } else if (result.time > 5000) {
                performance = '⚠️  Lento';
            } else {
                performance = '✅ Rápido';
            }
            
            console.log(`${statusIcon} ${result.test}: ${timeStr} - ${performance}`);
            if (result.error) {
                console.log(`   Erro: ${result.error}`);
            }
        });
        
        console.log(`\n📊 Total de testes: ${results.length}`);
        console.log(`✅ Sucessos: ${successCount}`);
        console.log(`❌ Erros: ${errorCount}`);
        console.log(`⏱️  Tempo total: ${(totalTime / 1000).toFixed(2)}s (${totalTime}ms)`);
        console.log(`📈 Tempo médio por teste: ${(totalTime / results.length / 1000).toFixed(2)}s`);
        
        if (totalTime > 30000) {
            console.log(`\n🔴 RECEBIMENTO MUITO LENTO (>30s total)`);
        } else if (totalTime > 15000) {
            console.log(`\n⚠️  Recebimento lento (>15s total)`);
        } else {
            console.log(`\n✅ Recebimento rápido (<15s total)`);
        }
        
        console.log('\n✅ Teste concluído!\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro no teste:', error);
        process.exit(1);
    }
}

testRecebimentoPerformance();



