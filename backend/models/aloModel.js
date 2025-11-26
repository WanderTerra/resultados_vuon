const { getDB } = require('../config/db');

class AloModel {
    // Resumo geral ALO
    static async getSummary() {
        const db = await getDB();
        const query = `
            SELECT 
                COUNT(*) as total_alo,
                COUNT(DISTINCT acao) as total_acoes,
                COUNT(DISTINCT nome) as total_clientes,
                MIN(data) as data_inicio,
                MAX(data) as data_fim
            FROM vuon_resultados
            WHERE agente != '0' 
                AND agente IS NOT NULL 
                AND agente != ''
        `;
        const [rows] = await db.execute(query);
        return rows[0];
    }

    // Lista de ações com percentuais
    static async getAcoes() {
        const db = await getDB();
        const query = `
            SELECT 
                acao,
                COUNT(*) as total,
                ROUND(COUNT(*) * 100.0 / (
                    SELECT COUNT(*) 
                    FROM vuon_resultados 
                    WHERE agente != '0' 
                        AND agente IS NOT NULL 
                        AND agente != ''
                ), 2) as percentual
            FROM vuon_resultados
            WHERE agente != '0' 
                AND agente IS NOT NULL 
                AND agente != ''
                AND acao IS NOT NULL
                AND LENGTH(acao) = 3
            GROUP BY acao
            ORDER BY total DESC
        `;
        const [rows] = await db.execute(query);
        return rows;
    }

    // Dados por data
    static async getByDate(limit = 30) {
        const db = await getDB();
        const query = `
            SELECT 
                data,
                COUNT(*) as total,
                COUNT(DISTINCT acao) as acoes_distintas
            FROM vuon_resultados
            WHERE agente != '0' 
                AND agente IS NOT NULL 
                AND agente != ''
            GROUP BY data
            ORDER BY data DESC
            LIMIT ?
        `;
        const [rows] = await db.execute(query, [limit]);
        return rows;
    }

    // CPC e CPCA por data
    static async getCpcCpcaByDate() {
        const db = await getDB();
        const query = `
            SELECT 
                data,
                SUM(CASE 
                    WHEN acao IN ('EIO', 'CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'APC', 'JUR', 'DDA') 
                    THEN 1 ELSE 0 
                END) as cpc,
                SUM(CASE 
                    WHEN acao IN ('CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'JUR', 'DDA') 
                    THEN 1 ELSE 0 
                END) as cpca
            FROM vuon_resultados
            WHERE agente != '0' 
                AND agente IS NOT NULL 
                AND agente != ''
                AND acao IS NOT NULL
            GROUP BY data
            ORDER BY data ASC
        `;
        const [rows] = await db.execute(query);
        return rows;
    }

    // Resumo CPC e CPCA
    static async getCpcCpcaSummary() {
        const db = await getDB();
        const query = `
            SELECT 
                SUM(CASE 
                    WHEN acao IN ('EIO', 'CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'APC', 'JUR', 'DDA') 
                    THEN 1 ELSE 0 
                END) as total_cpc,
                SUM(CASE 
                    WHEN acao IN ('CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'JUR', 'DDA') 
                    THEN 1 ELSE 0 
                END) as total_cpca,
                COUNT(*) as total_alo
            FROM vuon_resultados
            WHERE agente != '0' 
                AND agente IS NOT NULL 
                AND agente != ''
                AND acao IS NOT NULL
        `;
        const [rows] = await db.execute(query);
        return rows[0];
    }
}

module.exports = AloModel;

