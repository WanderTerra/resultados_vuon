const { getDB } = require('../config/db');
const BlocoModel = require('../models/blocoModel');
const PagamentoModel = require('../models/pagamentoModel');

async function testDashboardPerformance() {
    console.log('🚀 Testando performance do dashboard...\n');
    
    try {
        const db = await getDB();
        console.log('✅ Database connection established\n');
        
        // Teste 1: Dashboard sem filtros (query completa)
        console.log('======================================================================');
        console.log('📊 TESTE 1: Dashboard - Sem filtros (query completa)');
        console.log('======================================================================\n');
        
        const test1Start = Date.now();
        
        const [bloco1Data, bloco2Data, bloco3Data, woRecebimento, recebimento1, recebimento2, recebimento3, recebimentoWO] = await Promise.all([
            BlocoModel.getBlocoData(1, null, null, 'month'),
            BlocoModel.getBlocoData(2, null, null, 'month'),
            BlocoModel.getBlocoData(3, null, null, 'month'),
            BlocoModel.getRecebimento('wo', null, null),
            PagamentoModel.getRecebimentoData(1, null, null, 'month'),
            PagamentoModel.getRecebimentoData(2, null, null, 'month'),
            PagamentoModel.getRecebimentoData(3, null, null, 'month'),
            PagamentoModel.getRecebimentoData('wo', null, null, 'month')
        ]);
        
        const test1Time = Date.now() - test1Start;
        console.log(`\n   ✅ Sucesso! Tempo: ${(test1Time / 1000).toFixed(2)}s (${test1Time}ms)`);
        console.log(`   📊 Bloco 1: ${bloco1Data.acionadosXCarteira.length} meses`);
        console.log(`   📊 Bloco 2: ${bloco2Data.acionadosXCarteira.length} meses`);
        console.log(`   📊 Bloco 3: ${bloco3Data.acionadosXCarteira.length} meses`);
        console.log(`   💰 Recebimento WO: R$ ${woRecebimento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        
        if (test1Time > 30000) {
            console.log(`   🔴 MUITO LENTO (>30s)`);
        } else if (test1Time > 10000) {
            console.log(`   ⚠️  Lento (>10s)`);
        } else if (test1Time > 5000) {
            console.log(`   🟡 Aceitável (>5s)`);
        } else {
            console.log(`   ✅ Rápido (<5s)`);
        }
        
        // Teste 2: Dashboard com filtros (últimos 3 meses)
        console.log('\n======================================================================');
        console.log('📊 TESTE 2: Dashboard - Com filtros (últimos 3 meses)');
        console.log('======================================================================\n');
        
        const startDate = '2025-10-01';
        const endDate = '2025-12-31';
        
        const test2Start = Date.now();
        
        const [bloco1DataFiltered, bloco2DataFiltered, bloco3DataFiltered, woRecebimentoFiltered, recebimento1Filtered, recebimento2Filtered, recebimento3Filtered, recebimentoWOFiltered] = await Promise.all([
            BlocoModel.getBlocoData(1, startDate, endDate, 'month'),
            BlocoModel.getBlocoData(2, startDate, endDate, 'month'),
            BlocoModel.getBlocoData(3, startDate, endDate, 'month'),
            BlocoModel.getRecebimento('wo', startDate, endDate),
            PagamentoModel.getRecebimentoData(1, startDate, endDate, 'month'),
            PagamentoModel.getRecebimentoData(2, startDate, endDate, 'month'),
            PagamentoModel.getRecebimentoData(3, startDate, endDate, 'month'),
            PagamentoModel.getRecebimentoData('wo', startDate, endDate, 'month')
        ]);
        
        const test2Time = Date.now() - test2Start;
        console.log(`\n   ✅ Sucesso! Tempo: ${(test2Time / 1000).toFixed(2)}s (${test2Time}ms)`);
        console.log(`   📊 Bloco 1: ${bloco1DataFiltered.acionadosXCarteira.length} meses`);
        console.log(`   📊 Bloco 2: ${bloco2DataFiltered.acionadosXCarteira.length} meses`);
        console.log(`   📊 Bloco 3: ${bloco2DataFiltered.acionadosXCarteira.length} meses`);
        console.log(`   💰 Recebimento WO: R$ ${woRecebimentoFiltered.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        
        if (test2Time > 30000) {
            console.log(`   🔴 MUITO LENTO (>30s)`);
        } else if (test2Time > 10000) {
            console.log(`   ⚠️  Lento (>10s)`);
        } else if (test2Time > 5000) {
            console.log(`   🟡 Aceitável (>5s)`);
        } else {
            console.log(`   ✅ Rápido (<5s)`);
        }
        
        // Resumo
        console.log('\n======================================================================');
        console.log('📊 RESUMO DA PERFORMANCE');
        console.log('======================================================================\n');
        
        console.log(`📋 Dashboard - Sem filtros:`);
        console.log(`   Tempo: ${(test1Time / 1000).toFixed(2)}s`);
        if (test1Time > 30000) {
            console.log(`   Status: 🔴 MUITO LENTO`);
        } else if (test1Time > 10000) {
            console.log(`   Status: ⚠️  Lento`);
        } else if (test1Time > 5000) {
            console.log(`   Status: 🟡 Aceitável`);
        } else {
            console.log(`   Status: ✅ Rápido`);
        }
        
        console.log(`\n📋 Dashboard - Com filtros:`);
        console.log(`   Tempo: ${(test2Time / 1000).toFixed(2)}s`);
        if (test2Time > 30000) {
            console.log(`   Status: 🔴 MUITO LENTO`);
        } else if (test2Time > 10000) {
            console.log(`   Status: ⚠️  Lento`);
        } else if (test2Time > 5000) {
            console.log(`   Status: 🟡 Aceitável`);
        } else {
            console.log(`   Status: ✅ Rápido`);
        }
        
        console.log('\n✅ Teste concluído!\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro no teste:', error);
        process.exit(1);
    }
}

testDashboardPerformance();



