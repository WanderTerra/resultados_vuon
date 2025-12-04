const { getDB } = require('../config/db');

class AloModel {
    // Resumo geral ALO - OTIMIZADO: usa view quando disponível
    static async getSummary(startDate = null, endDate = null) {
        const db = await getDB();
        
        // Verificar se a view existe
        let useView = false;
        try {
            await db.execute('SELECT 1 FROM v_alo_resumo LIMIT 1');
            useView = true;
        } catch (error) {
            // View não existe, usar query direta
            useView = false;
        }
        
        if (useView && !startDate && !endDate) {
            // Se não há filtro de data, usar view de resumo geral
            const query = `SELECT * FROM v_alo_resumo`;
            const [rows] = await db.execute(query);
            return rows[0];
        }
        
        // Quando há filtro de data, usar query direta (mais simples e confiável)
        // A view agregada não facilita muito porque precisamos de COUNT(DISTINCT acao)
        let dateFilter = '';
        const params = [];
        
        if (startDate && endDate) {
            dateFilter = 'AND DATE(data) >= ? AND DATE(data) <= ?';
            params.push(startDate, endDate);
        } else if (startDate) {
            dateFilter = 'AND DATE(data) >= ?';
            params.push(startDate);
        } else if (endDate) {
            dateFilter = 'AND DATE(data) <= ?';
            params.push(endDate);
        }
        
        // OTIMIZAÇÃO: Usar índices criados (idx_agente_acao_data)
        // COUNT(DISTINCT) é inerentemente lento, mas os índices ajudam
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
                ${dateFilter}
        `;
        const [rows] = params.length > 0 
            ? await db.execute(query, params)
            : await db.execute(query);
        return rows[0];
    }

    // Lista de ações com percentuais - OTIMIZADO: usa view quando disponível
    static async getAcoes(startDate = null, endDate = null) {
        const db = await getDB();
        
        // Verificar se a view existe
        let useView = false;
        try {
            await db.execute('SELECT 1 FROM v_alo_acoes LIMIT 1');
            useView = true;
        } catch (error) {
            useView = false;
        }
        
        if (useView && !startDate && !endDate) {
            // Se não há filtro de data, usar view direta
            const query = `SELECT acao, total, ROUND(percentual, 2) as percentual FROM v_alo_acoes`;
            const [rows] = await db.execute(query);
            return rows;
        }
        
        // Se há filtro de data ou view não existe, usar query direta
        let dateFilter = '';
        const params = [];
        
        if (startDate && endDate) {
            dateFilter = 'AND DATE(data) >= ? AND DATE(data) <= ?';
            params.push(startDate, endDate);
        } else if (startDate) {
            dateFilter = 'AND DATE(data) >= ?';
            params.push(startDate);
        } else if (endDate) {
            dateFilter = 'AND DATE(data) <= ?';
            params.push(endDate);
        }
        
        // Query para contar total (para calcular percentual)
        let totalQuery = `
            SELECT COUNT(*) as total
            FROM vuon_resultados 
            WHERE agente != '0' 
                AND agente IS NOT NULL 
                AND agente != ''
                ${dateFilter}
        `;
        const [totalRows] = params.length > 0 
            ? await db.execute(totalQuery, params)
            : await db.execute(totalQuery);
        const total = totalRows[0]?.total || 1;
        
        const query = `
            SELECT 
                acao,
                COUNT(*) as total,
                ROUND(COUNT(*) * 100.0 / ?, 2) as percentual
            FROM vuon_resultados
            WHERE agente != '0' 
                AND agente IS NOT NULL 
                AND agente != ''
                AND acao IS NOT NULL
                AND LENGTH(acao) = 3
                ${dateFilter}
            GROUP BY acao
            ORDER BY total DESC
        `;
        const queryParams = [total, ...params];
        const [rows] = await db.execute(query, queryParams);
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

    // CPC e CPCA por data - OTIMIZADO: usa view quando disponível
    static async getCpcCpcaByDate(startDate = null, endDate = null) {
        const db = await getDB();
        
        // Verificar se a view existe
        let useView = false;
        try {
            await db.execute('SELECT 1 FROM v_cpc_cpca_por_data LIMIT 1');
            useView = true;
        } catch (error) {
            useView = false;
        }
        
        let dateFilter = '';
        const params = [];
        
        if (startDate && endDate) {
            dateFilter = 'AND data >= ? AND data <= ?';
            params.push(startDate, endDate);
        } else if (startDate) {
            dateFilter = 'AND data >= ?';
            params.push(startDate);
        } else if (endDate) {
            dateFilter = 'AND data <= ?';
            params.push(endDate);
        }
        
        if (useView) {
            // Usar view otimizada (já agrupa por data, apenas filtrar)
            const query = `
                SELECT 
                    data,
                    cpc,
                    cpca
                FROM v_cpc_cpca_por_data
                WHERE 1=1 ${dateFilter}
                ORDER BY data ASC
            `;
            const [rows] = params.length > 0 
                ? await db.execute(query, params)
                : await db.execute(query);
            return rows;
        }
        
        // Fallback: query direta
        const query = `
            SELECT 
                data,
                SUM(acao IN ('EIO', 'CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'APC', 'JUR', 'DDA')) as cpc,
                SUM(acao IN ('CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'JUR', 'DDA')) as cpca
            FROM vuon_resultados
            WHERE agente != '0' 
                AND agente IS NOT NULL 
                AND agente != ''
                AND acao IS NOT NULL
                ${dateFilter.replace(/data/g, 'DATE(data)')}
            GROUP BY data
            ORDER BY data ASC
        `;
        const [rows] = params.length > 0 
            ? await db.execute(query, params)
            : await db.execute(query);
        return rows;
    }

    // Resumo CPC e CPCA - OTIMIZADO: usa view quando disponível
    static async getCpcCpcaSummary(startDate = null, endDate = null) {
        const db = await getDB();
        
        // Verificar se a view existe
        let useView = false;
        try {
            await db.execute('SELECT 1 FROM v_alo_resumo LIMIT 1');
            useView = true;
        } catch (error) {
            useView = false;
        }
        
        if (useView && !startDate && !endDate) {
            // Se não há filtro de data, usar view de resumo
            const query = `SELECT total_cpc, total_cpca, total_alo FROM v_alo_resumo`;
            const [rows] = await db.execute(query);
            return rows[0];
        }
        
        // Se há filtro de data ou view não existe, usar view agregada ou query direta
        let dateFilter = '';
        const params = [];
        
        if (startDate && endDate) {
            dateFilter = 'AND data >= ? AND data <= ?';
            params.push(startDate, endDate);
        } else if (startDate) {
            dateFilter = 'AND data >= ?';
            params.push(startDate);
        } else if (endDate) {
            dateFilter = 'AND data <= ?';
            params.push(endDate);
        }
        
        if (useView) {
            // Usar view agregada
            const query = `
                SELECT 
                    SUM(cpc) as total_cpc,
                    SUM(cpca) as total_cpca,
                    SUM(total_alo) as total_alo
                FROM v_alo_agregado
                WHERE 1=1 ${dateFilter}
            `;
            const [rows] = params.length > 0 
                ? await db.execute(query, params)
                : await db.execute(query);
            return rows[0];
        }
        
        // Fallback: query direta
        const query = `
            SELECT 
                SUM(acao IN ('EIO', 'CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'APC', 'JUR', 'DDA')) as total_cpc,
                SUM(acao IN ('CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'JUR', 'DDA')) as total_cpca,
                COUNT(*) as total_alo
            FROM vuon_resultados
            WHERE agente != '0' 
                AND agente IS NOT NULL 
                AND agente != ''
                AND acao IS NOT NULL
                ${dateFilter.replace(/data/g, 'DATE(data)')}
        `;
        const [rows] = params.length > 0 
            ? await db.execute(query, params)
            : await db.execute(query);
        return rows[0];
    }

    // Buscar intervalo de datas (min e max) dos dados ALO
    static async getDateRange() {
        const db = await getDB();
        
        const query = `
            SELECT 
                DATE_FORMAT(MIN(DATE(data)), '%Y-%m-%d') as min_date,
                DATE_FORMAT(MAX(DATE(data)), '%Y-%m-%d') as max_date
            FROM vuon_resultados
            WHERE agente != '0' 
                AND agente IS NOT NULL 
                AND data IS NOT NULL
        `;
        
        const [rows] = await db.execute(query);
        const result = rows[0] || { min_date: null, max_date: null };
        
        // Garantir que as datas estão no formato string YYYY-MM-DD
        if (result.min_date && typeof result.min_date !== 'string') {
            result.min_date = result.min_date.toISOString().split('T')[0];
        }
        if (result.max_date && typeof result.max_date !== 'string') {
            result.max_date = result.max_date.toISOString().split('T')[0];
        }
        
        return result;
    }
}

module.exports = AloModel;

