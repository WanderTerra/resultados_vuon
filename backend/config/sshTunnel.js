const { Client } = require('ssh2');
const net = require('net');
require('dotenv').config();

let sshClient = null;
let tunnelServer = null;
let localPort = null;

const createSSHTunnel = () => {
    return new Promise((resolve, reject) => {
        // Check if tunnel already exists
        if (tunnelServer && localPort) {
            console.log(`✅ SSH tunnel already active on port ${localPort}`);
            return resolve(localPort);
        }

        const sshConfig = {
            host: process.env.SSH_HOST || '82.25.69.143',
            port: parseInt(process.env.SSH_PORT || '22'),
            username: process.env.SSH_USER || 'portes',
            password: process.env.SSH_PASSWORD || 'Portes@2025!@',
        };

        const mysqlConfig = {
            host: process.env.DB_REMOTE_HOST || 'localhost',
            port: parseInt(process.env.DB_REMOTE_PORT || '3306'),
        };

        console.log('🔐 Creating SSH tunnel...');
        console.log(`   SSH: ${sshConfig.username}@${sshConfig.host}:${sshConfig.port}`);
        console.log(`   MySQL: ${mysqlConfig.host}:${mysqlConfig.port}`);

        sshClient = new Client();

        sshClient.on('ready', () => {
            console.log('✅ SSH connection established');

            // Find available local port
            tunnelServer = net.createServer((localConnection) => {
                sshClient.forwardOut(
                    localConnection.remoteAddress,
                    localConnection.remotePort,
                    mysqlConfig.host,
                    mysqlConfig.port,
                    (err, sshStream) => {
                        if (err) {
                            localConnection.end();
                            console.error('❌ SSH forward error:', err.message);
                            return;
                        }
                        localConnection.pipe(sshStream).pipe(localConnection);
                    }
                );
            });

            tunnelServer.listen(0, '127.0.0.1', () => {
                localPort = tunnelServer.address().port;
                console.log(`✅ SSH tunnel created: localhost:${localPort} -> ${mysqlConfig.host}:${mysqlConfig.port}`);
                resolve(localPort);
            });

            tunnelServer.on('error', (err) => {
                console.error('❌ Tunnel server error:', err.message);
                reject(err);
            });
        });

        sshClient.on('error', (err) => {
            console.error('❌ SSH connection error:', err.message);
            reject(err);
        });

        sshClient.connect(sshConfig);
    });
};

const closeSSHTunnel = () => {
    return new Promise((resolve) => {
        if (tunnelServer) {
            tunnelServer.close(() => {
                console.log('🔒 SSH tunnel closed');
                tunnelServer = null;
                localPort = null;
            });
        }
        if (sshClient) {
            sshClient.end();
            sshClient = null;
        }
        resolve();
    });
};

// Auto-close on process exit
process.on('SIGINT', () => {
    closeSSHTunnel().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
    closeSSHTunnel().then(() => process.exit(0));
});

module.exports = { createSSHTunnel, closeSSHTunnel };

