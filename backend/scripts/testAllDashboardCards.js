const { getDB } = require('../config/db');
const BlocoModel = require('../models/blocoModel');
const PagamentoModel = require('../models/pagamentoModel');
const DiarioBordoModel = require('../models/diarioBordoModel');
const AloModel = require('../models/aloModel');

async function testAllDashboardCards() {
    console.log('🚀 Testando performance de TODOS os cards do dashboard...\n');
    
    try {
        const db = await getDB();
        console.log('✅ Database connection established\n');
        
        const results = [];
        
        // ======================================================================
        // CARD 1: Recebimento por Bloco
        // ======================================================================
        console.log('======================================================================');
        console.log('📊 CARD 1: Recebimento por Bloco');
        console.log('======================================================================\n');
        
        const recebimentoStart = Date.now();
        try {
            const [recebimento1, recebimento2, recebimento3, recebimentoWO] = await Promise.all([
                PagamentoModel.getRecebimentoData(1, null, null, 'month'),
                PagamentoModel.getRecebimentoData(2, null, null, 'month'),
                PagamentoModel.getRecebimentoData(3, null, null, 'month'),
                PagamentoModel.getRecebimentoData('wo', null, null, 'month')
            ]);
            
            const recebimentoTime = Date.now() - recebimentoStart;
            console.log(`   ✅ Sucesso! Tempo: ${(recebimentoTime / 1000).toFixed(2)}s (${recebimentoTime}ms)`);
            console.log(`   📊 Bloco 1: ${recebimento1.porMes.length} meses`);
            console.log(`   📊 Bloco 2: ${recebimento2.porMes.length} meses`);
            console.log(`   📊 Bloco 3: ${recebimento3.porMes.length} meses`);
            console.log(`   📊 WO: ${recebimentoWO.porMes.length} meses`);
            
            if (recebimentoTime > 10000) {
                console.log(`   🔴 MUITO LENTO (>10s)`);
            } else if (recebimentoTime > 5000) {
                console.log(`   ⚠️  Lento (>5s)`);
            } else {
                console.log(`   ✅ Rápido (<5s)`);
            }
            
            results.push({ card: 'Recebimento por Bloco', time: recebimentoTime, status: 'success' });
        } catch (error) {
            const recebimentoTime = Date.now() - recebimentoStart;
            console.log(`   ❌ Erro: ${error.message}`);
            results.push({ card: 'Recebimento por Bloco', time: recebimentoTime, status: 'error', error: error.message });
        }
        
        // ======================================================================
        // CARD 2: Diário de Bordo
        // ======================================================================
        console.log('\n======================================================================');
        console.log('📊 CARD 2: Diário de Bordo');
        console.log('======================================================================\n');
        
        const diarioStart = Date.now();
        try {
            const diarioData = await DiarioBordoModel.getAcordosPorHoraTodosBlocos(null);
            const diarioTime = Date.now() - diarioStart;
            console.log(`   ✅ Sucesso! Tempo: ${(diarioTime / 1000).toFixed(2)}s (${diarioTime}ms)`);
            console.log(`   📊 Total de horas: ${diarioData?.length || 0}`);
            
            if (diarioTime > 10000) {
                console.log(`   🔴 MUITO LENTO (>10s)`);
            } else if (diarioTime > 5000) {
                console.log(`   ⚠️  Lento (>5s)`);
            } else {
                console.log(`   ✅ Rápido (<5s)`);
            }
            
            results.push({ card: 'Diário de Bordo', time: diarioTime, status: 'success' });
        } catch (error) {
            const diarioTime = Date.now() - diarioStart;
            console.log(`   ❌ Erro: ${error.message}`);
            results.push({ card: 'Diário de Bordo', time: diarioTime, status: 'error', error: error.message });
        }
        
        // ======================================================================
        // CARD 3: Metrics (Summary ALO)
        // ======================================================================
        console.log('\n======================================================================');
        console.log('📊 CARD 3: Metrics (Summary ALO)');
        console.log('======================================================================\n');
        
        const metricsStart = Date.now();
        try {
            const [summary, cpcSummary] = await Promise.all([
                AloModel.getSummary(null, null),
                AloModel.getCpcCpcaSummary(null, null)
            ]);
            
            const metricsTime = Date.now() - metricsStart;
            console.log(`   ✅ Sucesso! Tempo: ${(metricsTime / 1000).toFixed(2)}s (${metricsTime}ms)`);
            console.log(`   📊 Summary: ${summary ? 'OK' : 'vazio'}`);
            console.log(`   📊 CPC Summary: ${cpcSummary ? 'OK' : 'vazio'}`);
            
            if (metricsTime > 10000) {
                console.log(`   🔴 MUITO LENTO (>10s)`);
            } else if (metricsTime > 5000) {
                console.log(`   ⚠️  Lento (>5s)`);
            } else {
                console.log(`   ✅ Rápido (<5s)`);
            }
            
            results.push({ card: 'Metrics (Summary ALO)', time: metricsTime, status: 'success' });
        } catch (error) {
            const metricsTime = Date.now() - metricsStart;
            console.log(`   ❌ Erro: ${error.message}`);
            results.push({ card: 'Metrics (Summary ALO)', time: metricsTime, status: 'error', error: error.message });
        }
        
        // ======================================================================
        // CARD 4: CPC/CPCA Chart
        // ======================================================================
        console.log('\n======================================================================');
        console.log('📊 CARD 4: CPC/CPCA Chart');
        console.log('======================================================================\n');
        
        const cpcCpcaStart = Date.now();
        try {
            const cpcCpcaData = await AloModel.getCpcCpcaByDate(null, null);
            const cpcCpcaTime = Date.now() - cpcCpcaStart;
            console.log(`   ✅ Sucesso! Tempo: ${(cpcCpcaTime / 1000).toFixed(2)}s (${cpcCpcaTime}ms)`);
            console.log(`   📊 Total de registros: ${cpcCpcaData?.length || 0}`);
            
            if (cpcCpcaTime > 10000) {
                console.log(`   🔴 MUITO LENTO (>10s)`);
            } else if (cpcCpcaTime > 5000) {
                console.log(`   ⚠️  Lento (>5s)`);
            } else {
                console.log(`   ✅ Rápido (<5s)`);
            }
            
            results.push({ card: 'CPC/CPCA Chart', time: cpcCpcaTime, status: 'success' });
        } catch (error) {
            const cpcCpcaTime = Date.now() - cpcCpcaStart;
            console.log(`   ❌ Erro: ${error.message}`);
            results.push({ card: 'CPC/CPCA Chart', time: cpcCpcaTime, status: 'error', error: error.message });
        }
        
        // ======================================================================
        // CARD 5: Ações Chart
        // ======================================================================
        console.log('\n======================================================================');
        console.log('📊 CARD 5: Ações Chart');
        console.log('======================================================================\n');
        
        const acoesStart = Date.now();
        try {
            const acoesData = await AloModel.getAcoes(null, null);
            const acoesTime = Date.now() - acoesStart;
            console.log(`   ✅ Sucesso! Tempo: ${(acoesTime / 1000).toFixed(2)}s (${acoesTime}ms)`);
            console.log(`   📊 Total de ações: ${acoesData?.length || 0}`);
            
            if (acoesTime > 10000) {
                console.log(`   🔴 MUITO LENTO (>10s)`);
            } else if (acoesTime > 5000) {
                console.log(`   ⚠️  Lento (>5s)`);
            } else {
                console.log(`   ✅ Rápido (<5s)`);
            }
            
            results.push({ card: 'Ações Chart', time: acoesTime, status: 'success' });
        } catch (error) {
            const acoesTime = Date.now() - acoesStart;
            console.log(`   ❌ Erro: ${error.message}`);
            results.push({ card: 'Ações Chart', time: acoesTime, status: 'error', error: error.message });
        }
        
        // ======================================================================
        // RESUMO FINAL
        // ======================================================================
        console.log('\n======================================================================');
        console.log('📊 RESUMO FINAL - TODOS OS CARDS');
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
            
            console.log(`${statusIcon} ${result.card}: ${timeStr} - ${performance}`);
            if (result.error) {
                console.log(`   Erro: ${result.error}`);
            }
        });
        
        console.log(`\n📊 Total de cards: ${results.length}`);
        console.log(`✅ Sucessos: ${successCount}`);
        console.log(`❌ Erros: ${errorCount}`);
        console.log(`⏱️  Tempo total: ${(totalTime / 1000).toFixed(2)}s (${totalTime}ms)`);
        console.log(`📈 Tempo médio por card: ${(totalTime / results.length / 1000).toFixed(2)}s`);
        
        if (totalTime > 30000) {
            console.log(`\n🔴 DASHBOARD MUITO LENTO (>30s total)`);
        } else if (totalTime > 15000) {
            console.log(`\n⚠️  Dashboard lento (>15s total)`);
        } else {
            console.log(`\n✅ Dashboard rápido (<15s total)`);
        }
        
        console.log('\n✅ Teste concluído!\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro no teste:', error);
        process.exit(1);
    }
}

testAllDashboardCards();

