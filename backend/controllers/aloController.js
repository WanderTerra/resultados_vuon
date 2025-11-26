const AloModel = require('../models/aloModel');

exports.getSummary = async (req, res) => {
    try {
        const summary = await AloModel.getSummary();
        res.json({ success: true, data: summary });
    } catch (error) {
        console.error('Error in getSummary:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            message: 'Erro ao buscar resumo ALO'
        });
    }
};

exports.getAcoes = async (req, res) => {
    try {
        const acoes = await AloModel.getAcoes();
        res.json({ success: true, data: acoes });
    } catch (error) {
        console.error('Error in getAcoes:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            message: 'Erro ao buscar ações'
        });
    }
};

exports.getByDate = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 30;
        const data = await AloModel.getByDate(limit);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error in getByDate:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            message: 'Erro ao buscar dados por data'
        });
    }
};

exports.getCpcCpcaByDate = async (req, res) => {
    try {
        const data = await AloModel.getCpcCpcaByDate();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error in getCpcCpcaByDate:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            message: 'Erro ao buscar CPC/CPCA por data'
        });
    }
};

exports.getCpcCpcaSummary = async (req, res) => {
    try {
        const summary = await AloModel.getCpcCpcaSummary();
        res.json({ success: true, data: summary });
    } catch (error) {
        console.error('Error in getCpcCpcaSummary:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            message: 'Erro ao buscar resumo CPC/CPCA'
        });
    }
};

