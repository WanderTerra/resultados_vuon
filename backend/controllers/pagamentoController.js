const PagamentoModel = require('../models/pagamentoModel');
const cache = require('../utils/cache');

// Buscar dados de recebimento por bloco
exports.getRecebimentoPorBloco = async (req, res) => {
    try {
        const bloco = parseInt(req.params.bloco);
        if (![1, 2, 3].includes(bloco) && bloco !== 'wo') {
            return res.status(400).json({ message: 'Bloco inválido. Use 1, 2, 3 ou "wo".' });
        }

        const startDate = req.query.startDate || null;
        const endDate = req.query.endDate || null;

        // Verificar cache
        const cacheKey = cache.generateKey('recebimento', bloco, startDate || 'all', endDate || 'all');
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Buscar dados de recebimento
        const recebimentoData = await PagamentoModel.getRecebimentoData(bloco, startDate, endDate);

        // Armazenar no cache
        cache.set(cacheKey, recebimentoData);

        res.json(recebimentoData);
    } catch (error) {
        console.error('Recebimento data error:', error);
        res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Buscar todos os recebimentos (para dashboard geral)
exports.getAllRecebimentos = async (req, res) => {
    try {
        const startDate = req.query.startDate || null;
        const endDate = req.query.endDate || null;

        // Verificar cache
        const cacheKey = cache.generateKey('allRecebimentos', startDate || 'all', endDate || 'all');
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Buscar dados de todos os blocos em paralelo
        const [recebimento1, recebimento2, recebimento3, recebimentoWO] = await Promise.all([
            PagamentoModel.getRecebimentoData(1, startDate, endDate),
            PagamentoModel.getRecebimentoData(2, startDate, endDate),
            PagamentoModel.getRecebimentoData(3, startDate, endDate),
            PagamentoModel.getRecebimentoData('wo', startDate, endDate)
        ]);

        const response = {
            bloco1: recebimento1,
            bloco2: recebimento2,
            bloco3: recebimento3,
            wo: recebimentoWO,
            total: recebimento1.total + recebimento2.total + recebimento3.total + recebimentoWO.total
        };

        // Armazenar no cache
        cache.set(cacheKey, response);

        res.json(response);
    } catch (error) {
        console.error('All recebimentos error:', error);
        res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

