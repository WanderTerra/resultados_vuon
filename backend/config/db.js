// Load .env FIRST, before anything else
require('dotenv').config();

const mysql = require('mysql2');

let pool = null;
let poolPromise = null; // Promise para evitar condições de corrida

const CONNECTION_LOST_CODES = ['PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'ECONNRESET'];

function invalidatePool() {
    if (pool) {
        try {
            pool.end();
        } catch (_) {}
        pool = null;
    }
    poolPromise = null;
}

const getPool = async () => {
    // Se já existe pool, retornar imediatamente
    if (pool) {
        return pool.promise();
    }

    // Se já existe uma promise de criação em andamento, aguardar ela
    if (poolPromise) {
        return poolPromise;
    }

    // Criar promise de inicialização (evita múltiplas criações simultâneas)
    poolPromise = (async () => {
        try {
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
                    poolPromise = null; // Reset para permitir nova tentativa
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
                connectionLimit: 20, // Aumentado de 10 para 20
                queueLimit: 0,
                connectTimeout: 10000, // 10 seconds timeout
                enableKeepAlive: true, // Manter conexões vivas
                keepAliveInitialDelay: 0
            });

            // Test connection before returning
            const dbPromise = pool.promise();
            console.log(`🧪 Testing connection to ${host}:${port}...`);
            try {
                const [result] = await dbPromise.execute('SELECT 1 as test');
                console.log('✅ Database pool connection verified');
                // Remover log detalhado do resultado para reduzir ruído
            } catch (error) {
                console.error('❌ Failed to verify database connection:');
                console.error('   Message:', error.message);
                console.error('   Code:', error.code);
                console.error('   Host:', host);
                console.error('   Port:', port);
                pool = null; // Reset pool so it can be retried
                poolPromise = null; // Reset promise
                throw error;
            }

            return dbPromise;
        } catch (error) {
            poolPromise = null; // Reset promise em caso de erro
            throw error;
        }
    })();

    return poolPromise;
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
        connectionLimit: 20, // Aumentado de 10 para 20
        queueLimit: 0,
        enableKeepAlive: true, // Manter conexões vivas
        keepAliveInitialDelay: 0
    });
    const dbPromise = pool.promise();
    
    // Verify dbPromise exists and has methods
    if (!dbPromise) {
        throw new Error('Failed to create database pool promise');
    }
    
    // Create a wrapper that has both the promise methods and getDB
    const dbWrapper = {
        getDB: getPool,
        invalidatePool,
        execute: (...args) => dbPromise.execute(...args),
        query: (...args) => dbPromise.query(...args),
        getConnection: (...args) => dbPromise.getConnection(...args)
    };
    module.exports = dbWrapper;
} else {
    // For SSH, create a wrapper that initializes on first use
    const { invalidateTunnel } = require('./sshTunnel');
    const runWithRetry = async (fn) => {
        try {
            const db = await getPool();
            return await fn(db);
        } catch (err) {
            if (CONNECTION_LOST_CODES.includes(err?.code)) {
                console.warn('⚠️ Connection lost or timeout, invalidating pool and tunnel for retry:', err.code);
                invalidateTunnel();
                invalidatePool();
                try {
                    const db = await getPool();
                    return await fn(db);
                } catch (retryErr) {
                    console.error('❌ Retry after connection lost failed:', retryErr.message);
                    throw retryErr;
                }
            }
            throw err;
        }
    };
    const dbWrapper = {
        getDB: getPool,
        invalidatePool,
        execute: async (...args) => runWithRetry((db) => db.execute(...args)),
        query: async (...args) => runWithRetry((db) => db.query(...args)),
        getConnection: async (...args) => {
            const db = await getPool();
            return db.getConnection(...args);
        }
    };
    module.exports = dbWrapper;
}

// Always export getDB function (after module.exports is set)
module.exports.getDB = getPool;
