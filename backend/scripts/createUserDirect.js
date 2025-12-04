require('dotenv').config();
const { Client } = require('ssh2');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');

console.log('🔐 Criando usuário de teste...\n');

// Get arguments from command line or use defaults
const args = process.argv.slice(2);
const username = args[0] || 'admin';
const password = args[1] || '123';
const nome = args[2] || 'Administrador';

console.log(`📝 Dados do usuário:`);
console.log(`   Username: ${username}`);
console.log(`   Nome: ${nome}`);
console.log('');

// Step 1: Create SSH tunnel
console.log('1️⃣ Criando túnel SSH...');
const sshConfig = {
    host: process.env.SSH_HOST || '82.25.69.143',
    port: parseInt(process.env.SSH_PORT || '22'),
    username: process.env.SSH_USER || 'portes',
    password: process.env.SSH_PASSWORD || 'Portes@2025!@',
};

const sshClient = new Client();
let tunnelServer = null;

sshClient.on('ready', () => {
    console.log('✅ Conexão SSH estabelecida!\n');
    
    // Step 2: Create tunnel
    console.log('2️⃣ Criando túnel para MySQL...');
    tunnelServer = require('net').createServer((localConnection) => {
        sshClient.forwardOut(
            localConnection.remoteAddress,
            localConnection.remotePort,
            process.env.DB_REMOTE_HOST || 'localhost',
            parseInt(process.env.DB_REMOTE_PORT || '3306'),
            (err, sshStream) => {
                if (err) {
                    console.error('❌ Erro no túnel SSH:', err.message);
                    localConnection.end();
                    return;
                }
                localConnection.pipe(sshStream).pipe(localConnection);
            }
        );
    });
    
    tunnelServer.listen(0, '127.0.0.1', () => {
        const localPort = tunnelServer.address().port;
        console.log(`✅ Túnel criado: localhost:${localPort}\n`);
        
        // Step 3: Connect to MySQL
        console.log('3️⃣ Conectando ao MySQL...');
        const connection = mysql.createConnection({
            host: '127.0.0.1',
            port: localPort,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'portes2025',
            database: process.env.DB_NAME || 'vuon',
        });
        
        connection.connect(async (err) => {
            if (err) {
                console.error('❌ Erro ao conectar:', err.message);
                tunnelServer.close();
                sshClient.end();
                process.exit(1);
                return;
            }
            
            console.log('✅ Conectado ao MySQL!\n');
            
            try {
                // Check if user already exists
                console.log('4️⃣ Verificando se usuário já existe...');
                const [existingUsers] = await connection.promise().execute(
                    'SELECT id FROM usuarios WHERE username = ?',
                    [username]
                );
                
                if (existingUsers.length > 0) {
                    console.error(`❌ Usuário '${username}' já existe!`);
                    connection.end();
                    tunnelServer.close();
                    sshClient.end();
                    process.exit(1);
                    return;
                }
                
                // Hash password
                console.log('5️⃣ Criptografando senha...');
                const hashedPassword = await bcrypt.hash(password, 10);
                
                // Insert user
                console.log('6️⃣ Criando usuário no banco...');
                const [result] = await connection.promise().execute(
                    'INSERT INTO usuarios (username, password_hash, nome, status) VALUES (?, ?, ?, ?)',
                    [username, hashedPassword, nome, 'ativo']
                );
                
                console.log('\n✅ Usuário criado com sucesso!');
                console.log(`   ID: ${result.insertId}`);
                console.log(`   Username: ${username}`);
                console.log(`   Nome: ${nome}`);
                console.log(`   Senha: ${password}`);
                
                connection.end();
                tunnelServer.close();
                sshClient.end();
                process.exit(0);
                
            } catch (error) {
                console.error('\n❌ Erro ao criar usuário:');
                console.error('   Mensagem:', error.message);
                console.error('   Código:', error.code);
                
                if (error.code === 'ER_NO_SUCH_TABLE') {
                    console.error('   A tabela "usuarios" não existe!');
                } else if (error.code === 'ER_DUP_ENTRY') {
                    console.error(`   Usuário '${username}' já existe!`);
                }
                
                connection.end();
                tunnelServer.close();
                sshClient.end();
                process.exit(1);
            }
        });
    });
    
    tunnelServer.on('error', (err) => {
        console.error('❌ Erro no servidor de túnel:', err.message);
        sshClient.end();
        process.exit(1);
    });
});

sshClient.on('error', (err) => {
    console.error('❌ Erro na conexão SSH:', err.message);
    process.exit(1);
});

sshClient.connect(sshConfig);

