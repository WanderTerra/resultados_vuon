const ProdutividadeModel = require('../models/produtividadeModel');

/**
 * Controller de Produtividade do Agente
 *
 * Agora utiliza `ProdutividadeModel` para retornar dados reais
 * consumidos pelos componentes `ProdutividadeChart` e
 * `ProdutividadeBarChart` no frontend.
 */

exports.getProdutividadeData = async (req, res) => {
    try {
        const { agenteId, startDate, endDate, groupBy } = req.query;

        const agenteIdNum = agenteId ? parseInt(agenteId, 10) : null;
        const groupByFinal = groupBy === 'day' ? 'day' : 'month';

        const dados = await ProdutividadeModel.getProdutividadeData(
            agenteIdNum,
            startDate || null,
            endDate || null,
            groupByFinal
        );

        return res.json(dados);
    } catch (error) {
        console.error('❌ Erro em getProdutividadeData:', error);
        return res.status(500).json({
            message: 'Erro ao buscar dados de produtividade',
            error: error.message
        });
    }
};

exports.getTopAgentes = async (req, res) => {
    try {
        const { limit, startDate, endDate } = req.query;
        const limitNum = limit ? parseInt(limit, 10) : 5;

        const dados = await ProdutividadeModel.getTopAgentes(
            limitNum,
            startDate || null,
            endDate || null
        );

        return res.json(dados);
    } catch (error) {
        console.error('❌ Erro em getTopAgentes:', error);
        return res.status(500).json({
            message: 'Erro ao buscar top agentes',
            error: error.message
        });
    }
};

