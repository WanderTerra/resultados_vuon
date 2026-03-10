const { Client } = require('ssh2');
const net = require('net');
require('dotenv').config();

let sshClient = null;
let tunnelServer = null;
let localPort = null;

const isTunnelConnected = () => {
    return sshClient != null && tunnelServer != null && localPort != null;
};

const createSSHTunnel = () => {
    return new Promise((resolve, reject) => {
        // Reuse only if tunnel server is still bound (SSH might have died; we'll recreate)
        if (tunnelServer && localPort) {
            console.log(`✅ SSH tunnel already active on port ${localPort}`);
            return resolve(localPort);
        }

        // If SSH died, clean up so we create a fresh tunnel
        if (sshClient) {
            try { sshClient.end(); } catch (_) {}
            sshClient = null;
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
                if (!sshClient) {
                    localConnection.end();
                    return;
                }
                try {
                    sshClient.forwardOut(
                        localConnection.remoteAddress,
                        localConnection.remotePort,
                        mysqlConfig.host,
                        mysqlConfig.port,
                        (err, sshStream) => {
                            if (err) {
                                localConnection.end();
                                if (err.message && err.message.includes('Not connected')) {
                                    console.warn('⚠️ SSH tunnel disconnected during forwardOut, invalidating tunnel');
                                    invalidateTunnel();
                                } else {
                                    console.error('❌ SSH forward error:', err.message);
                                }
                                return;
                            }
                            localConnection.pipe(sshStream).pipe(localConnection);
                        }
                    );
                } catch (e) {
                    localConnection.end();
                    if (e.message && e.message.includes('Not connected')) {
                        console.warn('⚠️ SSH tunnel not connected during forwardOut, invalidating tunnel');
                        invalidateTunnel();
                    } else {
                        console.error('❌ SSH forwardOut throw:', e.message);
                    }
                }
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
            invalidateTunnel();
            reject(err);
        });

        sshClient.on('close', () => {
            if (sshClient) {
                console.warn('⚠️ SSH connection closed');
                invalidateTunnel();
            }
        });

        sshClient.connect(sshConfig);
    });
};

function invalidateTunnel() {
    if (tunnelServer) {
        try {
            tunnelServer.close(() => {});
        } catch (_) {}
        tunnelServer = null;
        localPort = null;
    }
    if (sshClient) {
        try { sshClient.end(); } catch (_) {}
        sshClient = null;
    }
}

const closeSSHTunnel = () => {
    return new Promise((resolve) => {
        invalidateTunnel();
        console.log('🔒 SSH tunnel closed');
        setImmediate(resolve);
    });
};

// Auto-close on process exit
process.on('SIGINT', () => {
    closeSSHTunnel().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
    closeSSHTunnel().then(() => process.exit(0));
});

module.exports = { createSSHTunnel, closeSSHTunnel, invalidateTunnel, isTunnelConnected };

