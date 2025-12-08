const { getDB } = require('../config/db');

async function clearBorderoPagamento() {
    let db;
    
    try {
        console.log('🔌 Conectando ao banco de dados...');
        db = await getDB();
        
        // Verificar quantos registros existem antes
        const [countBefore] = await db.execute('SELECT COUNT(*) as total FROM vuon_bordero_pagamento');
        const totalBefore = countBefore[0]?.total || 0;
        console.log(`📊 Total de registros na tabela vuon_bordero_pagamento: ${totalBefore}`);
        
        if (totalBefore === 0) {
            console.log('✅ Tabela já está vazia. Nada a fazer.');
            process.exit(0);
        }
        
        // Confirmar antes de deletar
        console.log(`\n⚠️  ATENÇÃO: Você está prestes a deletar ${totalBefore} registros da tabela vuon_bordero_pagamento!`);
        console.log('   Esta operação NÃO pode ser desfeita.\n');
        
        // Deletar todos os registros
        console.log('🗑️  Deletando todos os registros...');
        const [result] = await db.execute('DELETE FROM vuon_bordero_pagamento');
        
        console.log(`✅ ${result.affectedRows} registros deletados com sucesso!`);
        
        // Verificar se a tabela está vazia
        const [countAfter] = await db.execute('SELECT COUNT(*) as total FROM vuon_bordero_pagamento');
        const totalAfter = countAfter[0]?.total || 0;
        console.log(`📊 Total de registros após limpeza: ${totalAfter}`);
        
        if (totalAfter === 0) {
            console.log('✅ Limpeza concluída com sucesso!');
        } else {
            console.log('⚠️  Ainda existem registros na tabela. Verifique manualmente.');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao limpar tabela vuon_bordero_pagamento:', error);
        process.exit(1);
    }
}

// Executar
clearBorderoPagamento();

