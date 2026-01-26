const { getDB } = require('../config/db');

const createAgentesTable = async () => {
    try {
        console.log('Creating agentes table...');

        // Get database connection (handles SSH tunnel if needed)
        const db = await getDB();

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

        console.log('✅ Tabela agentes criada com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao criar tabela agentes:', error);
        process.exit(1);
    }
};

createAgentesTable();

