require('dotenv').config();
const { getDB } = require('../config/db');

console.log('🔍 Verificando configuração...\n');
console.log('USE_SSH_TUNNEL:', process.env.USE_SSH_TUNNEL);
console.log('SSH_HOST:', process.env.SSH_HOST);
console.log('SSH_USER:', process.env.SSH_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('');

const testConnection = async () => {
    try {
        console.log('🔌 Tentando conectar ao banco de dados...\n');
        
        // Get database connection (handles SSH tunnel if needed)
        const db = await getDB();
        
        console.log('✅ Conexão estabelecida! Testando query...\n');
        
        // Test basic connection
        const [rows] = await db.execute('SELECT 1 as test, DATABASE() as db_name');
        console.log('✅ Query executada com sucesso!');
        console.log('   Database:', rows[0].db_name);
        
        // Check if usuarios table exists
        const [tables] = await db.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'usuarios'
        `);
        
        if (tables.length > 0) {
            console.log('\n✅ Tabela "usuarios" existe!');
            
            // Check existing users
            const [users] = await db.execute('SELECT id, username, nome, status FROM usuarios LIMIT 5');
            console.log(`\n👥 Usuários encontrados: ${users.length}`);
            users.forEach(user => {
                console.log(`   - ID: ${user.id}, Username: ${user.username}, Nome: ${user.nome}`);
            });
        } else {
            console.log('\n⚠️  Tabela "usuarios" não existe ainda.');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Erro na conexão:');
        console.error('   Mensagem:', error.message);
        console.error('   Código:', error.code);
        console.error('   Stack:', error.stack);
        
        if (error.message.includes('ssh2')) {
            console.error('\n💡 Erro relacionado ao SSH. Verifique:');
            console.error('   1. USE_SSH_TUNNEL=true no .env');
            console.error('   2. Credenciais SSH corretas');
            console.error('   3. Servidor SSH acessível');
        }
        
        process.exit(1);
    }
};

testConnection();

