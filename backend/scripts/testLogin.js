// Load .env first, before anything else
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Verify env vars are loaded
console.log('🔍 Verificando variáveis de ambiente:');
console.log('   USE_SSH_TUNNEL:', process.env.USE_SSH_TUNNEL);
console.log('   SSH_HOST:', process.env.SSH_HOST);
console.log('   DB_NAME:', process.env.DB_NAME);
console.log('');

const { getDB } = require('../config/db');
const bcrypt = require('bcrypt');

const testLogin = async () => {
    try {
        console.log('🔍 Testando conexão do banco para login...\n');
        
        // Test database connection
        console.log('   Verificando USE_SSH_TUNNEL:', process.env.USE_SSH_TUNNEL);
        const db = await getDB();
        console.log('✅ Conexão com banco estabelecida!\n');
        console.log('   Tipo de db:', typeof db);
        console.log('   Métodos disponíveis:', Object.keys(db));
        if (db.pool) {
            console.log('   Pool config:', {
                host: db.pool.config.connectionConfig.host,
                port: db.pool.config.connectionConfig.port,
                database: db.pool.config.connectionConfig.database
            });
        }
        
        // Test query
        console.log('\n🔍 Buscando usuário "admin"...');
        
        try {
            const [users] = await db.execute('SELECT * FROM usuarios WHERE username = ?', ['admin']);
        
            if (users.length === 0) {
                console.log('❌ Usuário "admin" não encontrado!');
                process.exit(1);
                return;
            }
            
            const user = users[0];
            console.log('✅ Usuário encontrado:');
            console.log(`   ID: ${user.id}`);
            console.log(`   Username: ${user.username}`);
            console.log(`   Nome: ${user.nome}`);
            console.log(`   Status: ${user.status}`);
            console.log('');
            
            // Test password
            console.log('🔍 Testando senha "123"...');
            const isMatch = await bcrypt.compare('123', user.password_hash);
            
            if (isMatch) {
                console.log('✅ Senha correta!');
            } else {
                console.log('❌ Senha incorreta!');
            }
            
            process.exit(0);
        } catch (queryError) {
            console.error('❌ Erro na query:', queryError.message);
            console.error('   Código:', queryError.code);
            console.error('   SQL State:', queryError.sqlState);
            console.error('   Stack:', queryError.stack);
            throw queryError;
        }
    } catch (error) {
        console.error('❌ Erro geral:', error.message);
        console.error('   Código:', error.code);
        console.error('   Stack:', error.stack);
        process.exit(1);
    }
};

testLogin();

