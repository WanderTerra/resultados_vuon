const { getDB } = require('../config/db');
const bcrypt = require('bcrypt');

const createUser = async (username, password, nome) => {
    try {
        // Get database connection (handles SSH tunnel if needed)
        const db = await getDB();
        
        // Check if user already exists
        const [existingUsers] = await db.execute(
            'SELECT id FROM usuarios WHERE username = ?',
            [username]
        );

        if (existingUsers.length > 0) {
            console.error(`User with username '${username}' already exists!`);
            process.exit(1);
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const [result] = await db.execute(
            'INSERT INTO usuarios (username, password_hash, nome, status) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, nome, 'ativo']
        );

        console.log(`✅ User created successfully!`);
        console.log(`   ID: ${result.insertId}`);
        console.log(`   Username: ${username}`);
        console.log(`   Nome: ${nome}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating user:');
        console.error('   Message:', error.message);
        console.error('   Code:', error.code);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.error('   Table "usuarios" does not exist!');
            console.error('   Please run: node scripts/initDatabase.js first');
        } else if (error.code === 'ER_DUP_ENTRY') {
            console.error(`   User with username '${username}' already exists!`);
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            console.error('   Cannot connect to database!');
            console.error('   Check your .env file and database connection settings.');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('   Access denied! Check your database credentials in .env file.');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('   Database does not exist!');
        } else {
            console.error('   Full error:', error);
        }
        process.exit(1);
    }
};

// Get arguments from command line or use defaults
const args = process.argv.slice(2);
const username = args[0] || 'admin';
const password = args[1] || '123';
const nome = args[2] || 'Administrador';

console.log('Creating user...');
createUser(username, password, nome);
