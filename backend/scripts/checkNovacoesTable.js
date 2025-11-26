const { getDB } = require('../config/db');

const checkNovacoesTable = async () => {
    try {
        console.log('🔍 Verificando estrutura da tabela vuon_novacoes...\n');
        
        const db = await getDB();
        
        // Verificar se a tabela existe
        const [tables] = await db.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'vuon_novacoes'
        `);
        
        if (tables.length === 0) {
            console.log('❌ Tabela vuon_novacoes não encontrada!');
            process.exit(1);
        }
        
        console.log('✅ Tabela vuon_novacoes encontrada!\n');
        
        // Listar todas as colunas
        const [columns] = await db.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'vuon_novacoes'
            ORDER BY ORDINAL_POSITION
        `);
        
        console.log('📋 Colunas na tabela vuon_novacoes:');
        console.log('─'.repeat(80));
        columns.forEach(col => {
            console.log(`   ${col.COLUMN_NAME.padEnd(30)} | ${col.DATA_TYPE.padEnd(20)} | nullable: ${col.IS_NULLABLE}`);
        });
        console.log('─'.repeat(80));
        
        // Verificar algumas linhas de exemplo
        const [rows] = await db.execute('SELECT * FROM vuon_novacoes LIMIT 3');
        if (rows.length > 0) {
            console.log('\n📊 Exemplo de dados (primeiras 3 linhas):');
            console.log(JSON.stringify(rows, null, 2));
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }
};

checkNovacoesTable();

