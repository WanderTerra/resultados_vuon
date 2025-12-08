const { getDB } = require('../config/db');

const clearNovacoes = async () => {
    try {
        console.log('🗑️  Iniciando limpeza da tabela vuon_novacoes...\n');
        
        const db = await getDB();
        
        // Verificar quantos registros existem antes
        const [countBefore] = await db.execute('SELECT COUNT(*) as total FROM vuon_novacoes');
        console.log(`📊 Registros antes da limpeza: ${countBefore[0].total.toLocaleString('pt-BR')}`);
        
        // Confirmar antes de deletar
        console.log('\n⚠️  ATENÇÃO: Esta operação irá DELETAR TODOS os dados da tabela vuon_novacoes!');
        console.log('   Certifique-se de que você tem um backup ou que os dados serão reinseridos.\n');
        
        // Fazer o DELETE
        console.log('🗑️  Executando DELETE...');
        const [result] = await db.execute('DELETE FROM vuon_novacoes');
        
        console.log(`✅ Limpeza concluída!`);
        console.log(`   Registros deletados: ${result.affectedRows.toLocaleString('pt-BR')}`);
        
        // Verificar quantos registros existem depois
        const [countAfter] = await db.execute('SELECT COUNT(*) as total FROM vuon_novacoes');
        console.log(`📊 Registros após a limpeza: ${countAfter[0].total.toLocaleString('pt-BR')}\n`);
        
        console.log('✅ Tabela vuon_novacoes limpa com sucesso!');
        console.log('   Agora você pode inserir os dados atualizados (maio até 04/12).\n');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Erro ao limpar tabela vuon_novacoes:');
        console.error('   Mensagem:', error.message);
        console.error('   Código:', error.code);
        process.exit(1);
    }
};

// Executar
clearNovacoes();

