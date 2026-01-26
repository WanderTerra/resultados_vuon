const AgentesModel = require('../models/agentesModel');

/**
 * Busca todos os agentes
 */
exports.getAll = async (req, res) => {
    try {
        const apenasFixos = req.query.apenasFixos === 'true';
        const agentes = await AgentesModel.getAll(apenasFixos);
        res.json(agentes);
    } catch (error) {
        console.error('❌ Erro ao buscar agentes:', error);
        res.status(500).json({
            message: 'Erro ao buscar agentes',
            error: error.message
        });
    }
};

/**
 * Busca um agente por ID
 */
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const agente = await AgentesModel.getById(id);
        
        if (!agente) {
            return res.status(404).json({ message: 'Agente não encontrado' });
        }
        
        res.json(agente);
    } catch (error) {
        console.error('❌ Erro ao buscar agente:', error);
        res.status(500).json({
            message: 'Erro ao buscar agente',
            error: error.message
        });
    }
};

/**
 * Cria um novo agente
 */
exports.create = async (req, res) => {
    try {
        const { numero_agente, nome, fixo_carteira, status } = req.body;

        if (!numero_agente) {
            return res.status(400).json({ message: 'Número do agente é obrigatório' });
        }

        // Verificar se já existe agente com esse número
        const agenteExistente = await AgentesModel.getByNumero(numero_agente);
        if (agenteExistente) {
            return res.status(400).json({ message: 'Já existe um agente com este número' });
        }

        const agente = await AgentesModel.create({
            numero_agente,
            nome,
            fixo_carteira: fixo_carteira || false,
            status: status || 'ativo'
        });

        res.status(201).json(agente);
    } catch (error) {
        console.error('❌ Erro ao criar agente:', error);
        res.status(500).json({
            message: 'Erro ao criar agente',
            error: error.message
        });
    }
};

/**
 * Atualiza um agente
 */
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { numero_agente, nome, fixo_carteira, status } = req.body;

        const agenteExistente = await AgentesModel.getById(id);
        if (!agenteExistente) {
            return res.status(404).json({ message: 'Agente não encontrado' });
        }

        // Se o número está sendo alterado, verificar se não existe outro com esse número
        if (numero_agente && numero_agente !== agenteExistente.numero_agente) {
            const agenteComNumero = await AgentesModel.getByNumero(numero_agente);
            if (agenteComNumero) {
                return res.status(400).json({ message: 'Já existe um agente com este número' });
            }
        }

        const agente = await AgentesModel.update(id, {
            numero_agente: numero_agente || agenteExistente.numero_agente,
            nome,
            fixo_carteira,
            status
        });

        res.json(agente);
    } catch (error) {
        console.error('❌ Erro ao atualizar agente:', error);
        res.status(500).json({
            message: 'Erro ao atualizar agente',
            error: error.message
        });
    }
};

/**
 * Remove um agente (soft delete)
 */
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const sucesso = await AgentesModel.delete(id);
        
        if (!sucesso) {
            return res.status(404).json({ message: 'Agente não encontrado' });
        }
        
        res.json({ message: 'Agente removido com sucesso' });
    } catch (error) {
        console.error('❌ Erro ao remover agente:', error);
        res.status(500).json({
            message: 'Erro ao remover agente',
            error: error.message
        });
    }
};

