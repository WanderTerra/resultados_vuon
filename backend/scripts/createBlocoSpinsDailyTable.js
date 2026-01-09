const { getDB } = require('../config/db');

/**
 * Cria e popula a tabela materializada de spins diários por bloco.
 *
 * DEFINIÇÃO: Spins = total de acionamentos no dia (COUNT(1) em vuon_resultados),
 * filtrando bloco por atraso.
 *
 * ⚠️ Pode demorar (1 scan na vuon_resultados).
 */
const createBlocoSpinsDailyTable = async () => {
    try {
        console.log('🚀 Criando tabela materializada bloco_spins_diario...\n');

        const db = await getDB();
        console.log('✅ Database connection established\n');

        await db.execute(`
            CREATE TABLE IF NOT EXISTS bloco_spins_diario (
                bloco VARCHAR(10) NOT NULL,
                data DATE NOT NULL,
                spins INT NOT NULL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (bloco, data),
                INDEX idx_data (data)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Tabela bloco_spins_diario pronta\n');

        console.log('🧹 Limpando dados antigos...\n');
        await db.execute(`TRUNCATE TABLE bloco_spins_diario`);

        console.log('📊 Populando (1 scan em vuon_resultados)...\n');
        await db.execute(`
            INSERT INTO bloco_spins_diario (bloco, data, spins)
            SELECT
                bloco,
                data,
                COUNT(1) as spins
            FROM (
                SELECT
                    CASE
                        WHEN atraso >= 61 AND atraso <= 90 THEN '1'
                        WHEN atraso >= 91 AND atraso <= 180 THEN '2'
                        WHEN atraso >= 181 AND atraso <= 360 THEN '3'
                        WHEN atraso >= 361 AND atraso <= 9999 THEN 'wo'
                        ELSE NULL
                    END as bloco,
                    data
                FROM vuon_resultados
                WHERE data IS NOT NULL
            ) t
            WHERE t.bloco IS NOT NULL
            GROUP BY t.bloco, t.data
        `);

        const [stats] = await db.execute(`
            SELECT COUNT(*) as total_rows, MIN(data) as min_data, MAX(data) as max_data
            FROM bloco_spins_diario
        `);
        const s = stats[0] || {};
        console.log(`✅ Concluído: ${s.total_rows || 0} linhas (${s.min_data || '-'} até ${s.max_data || '-'})\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
};

createBlocoSpinsDailyTable();





