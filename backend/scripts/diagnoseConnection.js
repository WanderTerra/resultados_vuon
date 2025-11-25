require('dotenv').config();
const mysql = require('mysql2');

console.log('🔍 Diagnosing database connection...\n');

// Show current configuration
console.log('📋 Current Configuration:');
console.log('   DB_HOST:', process.env.DB_HOST || 'localhost (default)');
console.log('   DB_PORT:', process.env.DB_PORT || '3306 (default)');
console.log('   DB_USER:', process.env.DB_USER || 'root (default)');
console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-3) : 'portes2025 (default)');
console.log('   DB_NAME:', process.env.DB_NAME || 'vuon (default)');
console.log('');

// Test connection with detailed error handling
const testConnection = async () => {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'portes2025',
        database: process.env.DB_NAME || 'vuon',
        connectTimeout: 10000, // 10 seconds timeout
    };

    console.log('🔌 Attempting connection to:', `${config.user}@${config.host}:${config.port}/${config.database}`);
    console.log('');

    return new Promise((resolve, reject) => {
        const connection = mysql.createConnection(config);

        connection.connect((err) => {
            if (err) {
                console.error('❌ Connection failed!');
                console.error('   Error Code:', err.code);
                console.error('   Error Message:', err.message);
                console.error('   Error SQL State:', err.sqlState || 'N/A');
                console.error('   Error Number:', err.errno || 'N/A');
                console.error('');

                // Provide specific guidance based on error code
                if (err.code === 'ECONNREFUSED') {
                    console.error('💡 Possible solutions:');
                    console.error('   1. Check if MySQL server is running');
                    console.error('   2. Verify DB_HOST and DB_PORT in .env file');
                    console.error('   3. If connecting to remote server, check:');
                    console.error('      - Server allows remote connections');
                    console.error('      - Firewall allows port 3306');
                    console.error('      - MySQL bind-address is configured correctly');
                    console.error('');
                    console.error('⚠️  IMPORTANT: Your .env shows DB_HOST=localhost');
                    console.error('   But you need to connect to: 82.25.69.143');
                    console.error('   Update your .env file with: DB_HOST=82.25.69.143');
                } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
                    console.error('💡 Possible solutions:');
                    console.error('   1. Check DB_USER and DB_PASSWORD in .env file');
                    console.error('   2. Verify user has permission to access this database');
                } else if (err.code === 'ER_BAD_DB_ERROR') {
                    console.error('💡 Possible solutions:');
                    console.error('   1. Check DB_NAME in .env file');
                    console.error('   2. Verify database exists on the server');
                } else if (err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
                    console.error('💡 Possible solutions:');
                    console.error('   1. Check if DB_HOST is correct (IP or hostname)');
                    console.error('   2. Verify network connectivity');
                    console.error('   3. Check DNS resolution if using hostname');
                }

                if (connection.state !== 'disconnected') {
                    connection.destroy();
                }
                reject(err);
            } else {
                console.log('✅ Connection successful!');
                connection.destroy();
                resolve();
            }
        });
        
        connection.on('error', (err) => {
            if (err.code !== 'PROTOCOL_CONNECTION_LOST') {
                console.error('❌ Connection error:', err.message);
            }
        });
    });
};

// Test without database first (to check server connection)
const testServerConnection = async () => {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'portes2025',
        connectTimeout: 10000,
    };

    console.log('🔌 Testing server connection (without database)...');
    console.log('   Connecting to:', `${config.user}@${config.host}:${config.port}`);
    console.log('');

    return new Promise((resolve, reject) => {
        const connection = mysql.createConnection(config);

        connection.connect((err) => {
            if (err) {
                console.error('❌ Server connection failed!');
                console.error('   This means the MySQL server itself is not reachable.');
                console.error('   Error Code:', err.code);
                console.error('   Error Message:', err.message);
                if (connection.state !== 'disconnected') {
                    connection.destroy();
                }
                reject(err);
            } else {
                console.log('✅ Server connection successful!');
                console.log('   The MySQL server is reachable.');
                connection.destroy();
                resolve();
            }
        });
        
        connection.on('error', (err) => {
            console.error('❌ Connection error:', err.message);
            if (err.code === 'ECONNREFUSED') {
                console.error('   Connection refused - server may not be running or host/port incorrect');
            }
        });
    });
};

// Run diagnostics
(async () => {
    try {
        // First test server connection
        await testServerConnection();
        console.log('');
        
        // Then test full connection with database
        await testConnection();
        console.log('');
        console.log('✅ All connection tests passed!');
        process.exit(0);
    } catch (error) {
        console.log('');
        console.error('❌ Connection diagnostics completed with errors.');
        process.exit(1);
    }
})();

