/**
 * Script de teste para verificar se a rota de quartis está funcionando
 * Execute: node test-quartis-route.js
 */

const express = require('express');
const app = express();

console.log('🔍 Testando carregamento da rota de quartis...\n');

try {
    // Tentar carregar o controller
    console.log('1. Testando carregamento do controller...');
    const quartisController = require('./controllers/quartisController');
    console.log('   ✅ Controller carregado com sucesso');
    console.log('   Métodos disponíveis:', Object.keys(quartisController));
    
    if (!quartisController.getQuartis) {
        throw new Error('Método getQuartis não encontrado no controller');
    }
    console.log('   ✅ Método getQuartis encontrado\n');
    
    // Tentar carregar o model
    console.log('2. Testando carregamento do model...');
    const QuartisModel = require('./models/quartisModel');
    console.log('   ✅ Model carregado com sucesso');
    console.log('   Métodos disponíveis:', Object.getOwnPropertyNames(QuartisModel).filter(name => typeof QuartisModel[name] === 'function'));
    
    if (!QuartisModel.getQuartis) {
        throw new Error('Método getQuartis não encontrado no model');
    }
    console.log('   ✅ Método getQuartis encontrado no model\n');
    
    // Tentar carregar as rotas
    console.log('3. Testando carregamento das rotas...');
    const dashboardRoutes = require('./routes/dashboardRoutes');
    console.log('   ✅ Rotas carregadas com sucesso\n');
    
    // Verificar se a rota está registrada
    console.log('4. Verificando se a rota está registrada...');
    const router = express.Router();
    router.get('/quartis', quartisController.getQuartis);
    console.log('   ✅ Rota /quartis pode ser registrada\n');
    
    console.log('✅ Todos os testes passaram!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Certifique-se de que o servidor foi reiniciado');
    console.log('   2. Verifique os logs do servidor ao fazer uma requisição');
    console.log('   3. Teste a rota: GET /api/dashboard/quartis');
    console.log('\n💡 Se o servidor já foi reiniciado e ainda dá 404, verifique:');
    console.log('   - Se os arquivos foram enviados para o servidor de produção');
    console.log('   - Se há erros nos logs do servidor');
    console.log('   - Se o servidor está usando o código atualizado');
    
    process.exit(0);
} catch (error) {
    console.error('❌ Erro encontrado:');
    console.error('   Mensagem:', error.message);
    console.error('   Stack:', error.stack);
    console.error('\n💡 Verifique:');
    console.error('   - Se todos os arquivos foram criados corretamente');
    console.error('   - Se há erros de sintaxe nos arquivos');
    console.error('   - Se as dependências estão instaladas');
    process.exit(1);
}

