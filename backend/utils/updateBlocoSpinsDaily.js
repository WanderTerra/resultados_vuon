const { getDB } = require('../config/db');

/**
 * Atualiza/insere spins diários (até ontem) na tabela materializada bloco_spins_diario.
 *
 * DEFINIÇÃO: Spins = total de acionamentos no dia (COUNT(1) em vuon_resultados),
 * filtrando pelo bloco via atraso, e por data (coluna DATE).
 *
 * Observação: como o usuário pediu "atualizar até ontem", este job NÃO escreve o dia atual.
 *
 * @param {boolean} silent
 */
const updateBlocoSpinsDaily = async (silent = false) => {
    try {
        const db = await getDB();

        // Garantir que a tabela exista (não falhar o servidor se ainda não foi criada)
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

        const today = new Date();
        const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
        const endDate = yesterday.toISOString().split('T')[0];

        if (!silent) {
            console.log(`🔄 Atualizando spins diários até ${endDate}...`);
        }

        // Descobrir a última data existente na tabela por bloco
        const [maxRows] = await db.execute(`
            SELECT bloco, MAX(data) as max_data
            FROM bloco_spins_diario
            GROUP BY bloco
        `);

        const maxByBloco = new Map();
        maxRows.forEach(r => {
            maxByBloco.set(r.bloco, r.max_data ? r.max_data.toISOString().split('T')[0] : null);
        });

        const blocos = ['1', '2', '3', 'wo'];

        // Para cada bloco: recomputar do dia seguinte ao max_data até ontem
        // (recomputo é idempotente via ON DUPLICATE KEY UPDATE).
        for (const bloco of blocos) {
            let startDate = maxByBloco.get(bloco);
            if (startDate) {
                const d = new Date(startDate);
                d.setDate(d.getDate() + 1);
                startDate = d.toISOString().split('T')[0];
            } else {
                // Se não existe nada ainda, começar do primeiro dia disponível em vuon_resultados para esse bloco
                const [minRows] = await db.execute(
                    `
                    SELECT MIN(data) as min_data
                    FROM vuon_resultados
                    WHERE data IS NOT NULL
                      AND (
                        (? = '1' AND atraso >= 61 AND atraso <= 90) OR
                        (? = '2' AND atraso >= 91 AND atraso <= 180) OR
                        (? = '3' AND atraso >= 181 AND atraso <= 360) OR
                        (? = 'wo' AND atraso >= 361 AND atraso <= 9999)
                      )
                    `,
                    [bloco, bloco, bloco, bloco]
                );
                const minData = minRows[0]?.min_data;
                if (!minData) {
                    if (!silent) console.log(`   ⚠️  Bloco ${bloco}: sem dados em vuon_resultados`);
                    continue;
                }
                startDate = minData.toISOString().split('T')[0];
            }

            if (startDate > endDate) {
                if (!silent) console.log(`   ✅ Bloco ${bloco}: já atualizado`);
                continue;
            }

            if (!silent) console.log(`   🔨 Bloco ${bloco}: atualizando de ${startDate} até ${endDate}`);

            await db.execute(
                `
                INSERT INTO bloco_spins_diario (bloco, data, spins)
                SELECT
                    ? as bloco,
                    data,
                    COUNT(1) as spins
                FROM vuon_resultados
                WHERE data >= ? AND data <= ?
                  AND (
                    (? = '1' AND atraso >= 61 AND atraso <= 90) OR
                    (? = '2' AND atraso >= 91 AND atraso <= 180) OR
                    (? = '3' AND atraso >= 181 AND atraso <= 360) OR
                    (? = 'wo' AND atraso >= 361 AND atraso <= 9999)
                  )
                GROUP BY data
                ON DUPLICATE KEY UPDATE spins = VALUES(spins)
                `,
                [bloco, startDate, endDate, bloco, bloco, bloco, bloco]
            );
        }

        if (!silent) {
            console.log('✅ Spins diários atualizados.\n');
        }
    } catch (error) {
        console.error('⚠️  Erro ao atualizar bloco_spins_diario:', error.message);
    }
};

module.exports = { updateBlocoSpinsDaily };





