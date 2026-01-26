const { getDB } = require('../config/db');

const initDatabase = async () => {
    try {
        console.log('Initializing database...');

        // Get database connection (handles SSH tunnel if needed)
        const db = await getDB();

        // Create usuarios table if it doesn't exist
        await db.execute(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                nome VARCHAR(100) NOT NULL,
                status ENUM('ativo', 'inativo') DEFAULT 'ativo',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create permissoes table if it doesn't exist
        await db.execute(`
            CREATE TABLE IF NOT EXISTS permissoes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                codigo VARCHAR(50) UNIQUE NOT NULL,
                descricao VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create usuario_permissao table if it doesn't exist
        await db.execute(`
            CREATE TABLE IF NOT EXISTS usuario_permissao (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                permissao_id INT NOT NULL,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (permissao_id) REFERENCES permissoes(id) ON DELETE CASCADE,
                UNIQUE KEY unique_usuario_permissao (usuario_id, permissao_id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create agentes table if it doesn't exist
        await db.execute(`
            CREATE TABLE IF NOT EXISTS agentes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                numero_agente VARCHAR(50) UNIQUE NOT NULL,
                nome VARCHAR(255),
                fixo_carteira BOOLEAN DEFAULT FALSE,
                status ENUM('ativo', 'inativo') DEFAULT 'ativo',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_fixo_carteira (fixo_carteira),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('Database initialized successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
};

initDatabase();

