const { getDB } = require('../config/db');

class AgentesModel {
    /**
     * Busca todos os agentes
     * @param {boolean} apenasFixos - Se true, retorna apenas agentes fixos da carteira
     * @returns {Promise<Array>} Lista de agentes
     */
    static async getAll(apenasFixos = false) {
        const db = await getDB();
        let query = 'SELECT * FROM agentes';
        const params = [];

        if (apenasFixos) {
            query += ' WHERE fixo_carteira = ? AND status = ?';
            params.push(true, 'ativo');
        } else {
            query += ' WHERE status = ?';
            params.push('ativo');
        }

        query += ' ORDER BY numero_agente ASC';

        const [rows] = await db.execute(query, params);
        return rows;
    }

    /**
     * Busca um agente por ID
     * @param {number} id - ID do agente
     * @returns {Promise<Object|null>} Dados do agente
     */
    static async getById(id) {
        const db = await getDB();
        const [rows] = await db.execute(
            'SELECT * FROM agentes WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    }

    /**
     * Busca um agente por número
     * @param {string} numeroAgente - Número do agente
     * @returns {Promise<Object|null>} Dados do agente
     */
    static async getByNumero(numeroAgente) {
        const db = await getDB();
        const [rows] = await db.execute(
            'SELECT * FROM agentes WHERE numero_agente = ?',
            [numeroAgente]
        );
        return rows[0] || null;
    }

    /**
     * Cria um novo agente
     * @param {Object} agenteData - Dados do agente
     * @returns {Promise<Object>} Agente criado
     */
    static async create(agenteData) {
        const db = await getDB();
        const { numero_agente, nome, fixo_carteira, status } = agenteData;
        
        const [result] = await db.execute(
            `INSERT INTO agentes (numero_agente, nome, fixo_carteira, status) 
             VALUES (?, ?, ?, ?)`,
            [numero_agente, nome || null, fixo_carteira || false, status || 'ativo']
        );

        return await this.getById(result.insertId);
    }

    /**
     * Atualiza um agente
     * @param {number} id - ID do agente
     * @param {Object} agenteData - Dados atualizados
     * @returns {Promise<Object>} Agente atualizado
     */
    static async update(id, agenteData) {
        const db = await getDB();
        const { numero_agente, nome, fixo_carteira, status } = agenteData;
        
        await db.execute(
            `UPDATE agentes 
             SET numero_agente = ?, nome = ?, fixo_carteira = ?, status = ?
             WHERE id = ?`,
            [numero_agente, nome || null, fixo_carteira || false, status || 'ativo', id]
        );

        return await this.getById(id);
    }

    /**
     * Remove um agente (soft delete - marca como inativo)
     * @param {number} id - ID do agente
     * @returns {Promise<boolean>} True se removido com sucesso
     */
    static async delete(id) {
        const db = await getDB();
        const [result] = await db.execute(
            'UPDATE agentes SET status = ? WHERE id = ?',
            ['inativo', id]
        );
        return result.affectedRows > 0;
    }

    /**
     * Busca números dos agentes fixos da carteira
     * @returns {Promise<Array<string>>} Array com números dos agentes fixos
     */
    static async getNumerosFixos() {
        const db = await getDB();
        const [rows] = await db.execute(
            'SELECT numero_agente FROM agentes WHERE fixo_carteira = ? AND status = ?',
            [true, 'ativo']
        );
        return rows.map(row => row.numero_agente);
    }

    /**
     * Busca agentes únicos da tabela vuon_resultados
     * Extrai número e nome quando disponível (formato: "número - nome" ou apenas "número")
     * @returns {Promise<Array<{numero: string, nome: string|null}>>} Lista de agentes com número e nome
     */
    static async getAgentesFromResultados() {
        const db = await getDB();
        const query = `
            SELECT DISTINCT agente
            FROM vuon_resultados
            WHERE agente IS NOT NULL
                AND agente != ''
                AND agente != '0'
            ORDER BY agente ASC
        `;
        
        const [rows] = await db.execute(query);
        
        // Processar cada agente para extrair número e nome
        const agentesProcessados = rows.map(row => {
            const agente = row.agente.trim();
            
            // Se for apenas número, retornar direto
            if (/^\d+$/.test(agente)) {
                return {
                    numero: agente,
                    nome: null,
                    agente_completo: agente
                };
            }
            
            // Se tiver formato "número - nome", extrair ambos
            const match = agente.match(/^(\d+)\s*-\s*(.+)$/);
            if (match) {
                return {
                    numero: match[1].trim(),
                    nome: match[2].trim(),
                    agente_completo: agente
                };
            }
            
            // Se não encontrar número no início, tentar extrair qualquer número
            const numeroMatch = agente.match(/(\d+)/);
            if (numeroMatch) {
                return {
                    numero: numeroMatch[1],
                    nome: agente.replace(numeroMatch[1], '').trim().replace(/^-\s*/, '').trim() || null,
                    agente_completo: agente
                };
            }
            
            // Fallback: retornar o valor original como número
            return {
                numero: agente,
                nome: null,
                agente_completo: agente
            };
        });
        
        // Remover duplicatas baseado no número
        const agentesUnicos = new Map();
        agentesProcessados.forEach(agente => {
            if (!agentesUnicos.has(agente.numero)) {
                agentesUnicos.set(agente.numero, agente);
            } else {
                // Se já existe, manter o que tem nome (se o atual não tiver)
                const existente = agentesUnicos.get(agente.numero);
                if (!existente.nome && agente.nome) {
                    agentesUnicos.set(agente.numero, agente);
                }
            }
        });
        
        return Array.from(agentesUnicos.values()).sort((a, b) => {
            const numA = parseInt(a.numero) || 0;
            const numB = parseInt(b.numero) || 0;
            return numA - numB;
        });
    }
}

module.exports = AgentesModel;

