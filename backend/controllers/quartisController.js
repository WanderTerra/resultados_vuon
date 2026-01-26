const QuartisModel = require('../models/quartisModel');

/**
 * Busca dados de quartis de DDA por agente
 * Query params:
 * - startDate: Data inicial (opcional, formato YYYY-MM-DD)
 * - endDate: Data final (opcional, formato YYYY-MM-DD)
 */
exports.getQuartis = async (req, res) => {
    try {
        const { startDate, endDate, apenasFixos } = req.query;
        // Se o parâmetro não for enviado ou for diferente de 'true', assume false (mostrar todos)
        // Se for 'true', mostra apenas fixos
        const apenasFixosBool = apenasFixos === 'true';
        
        console.log(`📊 Quartis - Request recebido:`);
        console.log(`   Período: ${startDate || 'todos'} até ${endDate || 'todos'}`);
        console.log(`   Apenas fixos: ${apenasFixosBool}`);
        
        const dados = await QuartisModel.getQuartis(startDate, endDate, apenasFixosBool);
        
        console.log(`✅ Quartis - Dados retornados:`);
        console.log(`   Total de agentes: ${dados.totalAgentes}`);
        console.log(`   Quartil 1: ${dados.quartil1.length} agentes`);
        console.log(`   Quartil 2: ${dados.quartil2.length} agentes`);
        console.log(`   Quartil 3: ${dados.quartil3.length} agentes`);
        console.log(`   Quartil 4: ${dados.quartil4.length} agentes`);
        
        res.json(dados);
    } catch (error) {
        console.error('❌ Erro ao buscar quartis:', error);
        res.status(500).json({
            message: 'Erro ao buscar dados de quartis',
            error: error.message
        });
    }
};

