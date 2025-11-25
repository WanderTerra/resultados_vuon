const { getDB } = require('../config/db');

const testConnection = async () => {
    try {
        console.log('Testing database connection...');
        
        // Get database connection (handles SSH tunnel if needed)
        const db = await getDB();
        
        // Test basic connection
        const [rows] = await db.execute('SELECT 1 as test');
        console.log('✅ Database connection successful!');
        
        // Check if tables exist
        const [tables] = await db.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
        `);
        
        console.log(`\n📊 Found ${tables.length} table(s):`);
        tables.forEach(table => {
            console.log(`   - ${table.TABLE_NAME}`);
        });
        
        // Check usuarios table structure
        const [usuariosTable] = await db.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'usuarios'
        `);
        
        if (usuariosTable.length > 0) {
            console.log('\n✅ Table "usuarios" exists');
            
            // Check columns
            const [columns] = await db.execute(`
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'usuarios'
                ORDER BY ORDINAL_POSITION
            `);
            
            console.log('\n📋 Columns in "usuarios" table:');
            columns.forEach(col => {
                console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}, nullable: ${col.IS_NULLABLE})`);
            });
            
            // Check existing users
            const [users] = await db.execute('SELECT id, username, nome, status FROM usuarios');
            console.log(`\n👥 Existing users: ${users.length}`);
            users.forEach(user => {
                console.log(`   - ID: ${user.id}, Username: ${user.username}, Nome: ${user.nome}, Status: ${user.status}`);
            });
        } else {
            console.log('\n❌ Table "usuarios" does not exist!');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error('   Message:', error.message);
        console.error('   Code:', error.code);
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            console.error('   Cannot connect to database server!');
            console.error('   Check your DB_HOST and DB_PORT in .env file.');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('   Access denied! Check your DB_USER and DB_PASSWORD in .env file.');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('   Database does not exist! Check your DB_NAME in .env file.');
        }
        process.exit(1);
    }
};

testConnection();

