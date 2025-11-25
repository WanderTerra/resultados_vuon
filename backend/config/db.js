// Load .env FIRST, before anything else
require('dotenv').config();

const mysql = require('mysql2');

let pool = null;

const getPool = async () => {
    if (pool) {
        return pool.promise();
    }

    // Check if SSH tunnel is needed
    const useSSH = process.env.USE_SSH_TUNNEL === 'true';
    
    let host = process.env.DB_HOST || 'localhost';
    let port = parseInt(process.env.DB_PORT || '3306');

    if (useSSH) {
        const { createSSHTunnel } = require('./sshTunnel');
        try {
            const localPort = await createSSHTunnel();
            host = '127.0.0.1';
            port = localPort;
            console.log(`📡 Using SSH tunnel: connecting to localhost:${port}`);
        } catch (error) {
            console.error('❌ Failed to create SSH tunnel:', error.message);
            throw error;
        }
    }

    console.log(`🔌 Creating MySQL pool: ${process.env.DB_USER}@${host}:${port}/${process.env.DB_NAME || 'vuon'}`);
    
    pool = mysql.createPool({
        host: host,
        port: port,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'portes2025',
        database: process.env.DB_NAME || 'vuon',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 10000 // 10 seconds timeout
    });

    // Test connection before returning
    const dbPromise = pool.promise();
    console.log(`🧪 Testing connection to ${host}:${port}...`);
    try {
        const [result] = await dbPromise.execute('SELECT 1 as test');
        console.log('✅ Database pool connection verified');
        console.log(`   Test result:`, result);
    } catch (error) {
        console.error('❌ Failed to verify database connection:');
        console.error('   Message:', error.message);
        console.error('   Code:', error.code);
        console.error('   Host:', host);
        console.error('   Port:', port);
        pool = null; // Reset pool so it can be retried
        throw error;
    }

    return dbPromise;
};

// For backward compatibility - initialize pool immediately if not using SSH
// Check USE_SSH_TUNNEL after ensuring .env is loaded
const useSSHForInit = process.env.USE_SSH_TUNNEL === 'true';
console.log('🔍 db.js initialization - USE_SSH_TUNNEL:', process.env.USE_SSH_TUNNEL, '-> useSSHForInit:', useSSHForInit);

if (!useSSHForInit) {
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'portes2025',
        database: process.env.DB_NAME || 'vuon',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    const dbPromise = pool.promise();
    
    // Verify dbPromise exists and has methods
    if (!dbPromise) {
        throw new Error('Failed to create database pool promise');
    }
    
    // Create a wrapper that has both the promise methods and getDB
    const dbWrapper = {
        getDB: getPool,
        execute: (...args) => dbPromise.execute(...args),
        query: (...args) => dbPromise.query(...args),
        getConnection: (...args) => dbPromise.getConnection(...args)
    };
    module.exports = dbWrapper;
} else {
    // For SSH, create a wrapper that initializes on first use
    const dbWrapper = {
        getDB: getPool,
        execute: async (...args) => {
            const db = await getPool();
            return db.execute(...args);
        },
        query: async (...args) => {
            const db = await getPool();
            return db.query(...args);
        },
        getConnection: async (...args) => {
            const db = await getPool();
            return db.getConnection(...args);
        }
    };
    module.exports = dbWrapper;
}

// Always export getDB function (after module.exports is set)
module.exports.getDB = getPool;
