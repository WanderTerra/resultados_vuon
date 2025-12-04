require('dotenv').config();
const { Client } = require('ssh2');
const mysql = require('mysql2');

console.log('🔍 Testando conexão direta...\n');

// Step 1: Test SSH connection
console.log('1️⃣ Testando conexão SSH...');
const sshConfig = {
    host: process.env.SSH_HOST || '82.25.69.143',
    port: parseInt(process.env.SSH_PORT || '22'),
    username: process.env.SSH_USER || 'portes',
    password: process.env.SSH_PASSWORD || 'Portes@2025!@',
};

console.log(`   Conectando a: ${sshConfig.username}@${sshConfig.host}:${sshConfig.port}`);

const sshClient = new Client();

sshClient.on('ready', () => {
    console.log('✅ Conexão SSH estabelecida com sucesso!\n');
    
    // Step 2: Test MySQL connection through SSH tunnel
    console.log('2️⃣ Testando túnel SSH para MySQL...');
    
    const net = require('net');
    let tunnelServer = null;
    
    tunnelServer = net.createServer((localConnection) => {
        sshClient.forwardOut(
            localConnection.remoteAddress,
            localConnection.remotePort,
            process.env.DB_REMOTE_HOST || 'localhost',
            parseInt(process.env.DB_REMOTE_PORT || '3306'),
            (err, sshStream) => {
                if (err) {
                    console.error('❌ Erro ao criar túnel SSH:', err.message);
                    localConnection.end();
                    sshClient.end();
                    process.exit(1);
                    return;
                }
                localConnection.pipe(sshStream).pipe(localConnection);
            }
        );
    });
    
    tunnelServer.listen(0, '127.0.0.1', () => {
        const localPort = tunnelServer.address().port;
        console.log(`✅ Túnel SSH criado: localhost:${localPort} -> ${process.env.DB_REMOTE_HOST || 'localhost'}:${process.env.DB_REMOTE_PORT || '3306'}\n`);
        
        // Step 3: Test MySQL connection
        console.log('3️⃣ Testando conexão MySQL através do túnel...');
        
        const mysqlConfig = {
            host: '127.0.0.1',
            port: localPort,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'portes2025',
            database: process.env.DB_NAME || 'vuon',
        };
        
        console.log(`   Conectando a: ${mysqlConfig.user}@${mysqlConfig.host}:${mysqlConfig.port}/${mysqlConfig.database}`);
        
        const connection = mysql.createConnection(mysqlConfig);
        
        connection.connect((err) => {
            if (err) {
                console.error('❌ Erro ao conectar ao MySQL:', err.message);
                console.error('   Código:', err.code);
                tunnelServer.close();
                sshClient.end();
                process.exit(1);
                return;
            }
            
            console.log('✅ Conexão MySQL estabelecida com sucesso!\n');
            
            // Step 4: Test query
            console.log('4️⃣ Testando query no banco de dados...');
            
            connection.query('SELECT DATABASE() as db, USER() as user, 1 as test', (err, results) => {
                if (err) {
                    console.error('❌ Erro ao executar query:', err.message);
                    connection.end();
                    tunnelServer.close();
                    sshClient.end();
                    process.exit(1);
                    return;
                }
                
                console.log('✅ Query executada com sucesso!');
                console.log('   Database:', results[0].db);
                console.log('   User:', results[0].user);
                console.log('');
                
                // Check usuarios table
                connection.query('SELECT COUNT(*) as count FROM usuarios', (err, results) => {
                    if (err) {
                        if (err.code === 'ER_NO_SUCH_TABLE') {
                            console.log('⚠️  Tabela "usuarios" não existe ainda.');
                        } else {
                            console.error('❌ Erro:', err.message);
                        }
                    } else {
                        console.log(`✅ Tabela "usuarios" existe com ${results[0].count} registro(s).`);
                    }
                    
                    connection.end();
                    tunnelServer.close();
                    sshClient.end();
                    console.log('\n✅ Todos os testes passaram!');
                    process.exit(0);
                });
            });
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
    console.error('   Verifique:');
    console.error('   - SSH_HOST está correto?');
    console.error('   - SSH_USER e SSH_PASSWORD estão corretos?');
    console.error('   - Servidor SSH está acessível?');
    process.exit(1);
});

sshClient.connect(sshConfig);

