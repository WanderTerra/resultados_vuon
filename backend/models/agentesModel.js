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
}

module.exports = AgentesModel;

