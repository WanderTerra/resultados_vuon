const { getDB } = require('../config/db');

const checkTable = async () => {
    try {
        const db = await getDB();
        
        const [columns] = await db.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'vuon_novacoes'
            ORDER BY ORDINAL_POSITION
        `);
        
        console.log('📋 Colunas da tabela vuon_novacoes:');
        columns.forEach(col => {
            console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}, nullable: ${col.IS_NULLABLE})`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }
};

checkTable();
