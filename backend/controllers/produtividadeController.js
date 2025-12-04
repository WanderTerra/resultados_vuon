const RecebimentoCobradorModel = require('../models/recebimentoCobradorModel');
const cache = require('../utils/cache');

// Buscar dados de produtividade do agente
exports.getProdutividadeData = async (req, res) => {
    try {
        const agenteId = req.query.agenteId ? parseInt(req.query.agenteId) : null;
        const startDate = req.query.startDate || null;
        const endDate = req.query.endDate || null;
        const groupBy = req.query.groupBy || 'month'; // 'day' ou 'month'
        const noCache = req.query._nocache === 'true' || req.query._t; // Ignorar cache se _nocache=true ou se houver timestamp

        console.log(`📥 Produtividade - Request recebido: agenteId=${agenteId}, startDate=${startDate}, endDate=${endDate}, groupBy=${groupBy}`);

        // Verificar cache apenas se não houver flag para ignorar cache
        let cached = null;
        if (!noCache) {
            const cacheKey = cache.generateKey('produtividade', agenteId || 'all', startDate || 'all', endDate || 'all', groupBy);
            cached = cache.get(cacheKey);
            if (cached) {
                console.log(`📦 Produtividade - Retornando do cache`);
                return res.json(cached);
            }
        } else {
            // Se houver filtros, limpar cache relacionado para evitar dados antigos
            if (agenteId || startDate || endDate) {
                const cachePrefix = 'produtividade:';
                const cleared = cache.clearByPrefix(cachePrefix);
                console.log(`🗑️  Produtividade - ${cleared} entradas de cache limpas para evitar dados antigos`);
            }
        }

        // Buscar dados de produtividade
        const produtividadeData = await RecebimentoCobradorModel.getProdutividadeData(agenteId, startDate, endDate, groupBy);

        // Formatar resposta
        const response = {
            resumo: produtividadeData.resumo,
            porBloco: produtividadeData.porBloco,
            agentes: produtividadeData.agentes
        };

        console.log(`📤 Produtividade - Enviando resposta: ${response.porBloco.bloco1.length} períodos, ${response.agentes.length} agentes`);

        // Armazenar no cache apenas se não houver flag para ignorar cache
        if (!noCache) {
            const cacheKey = cache.generateKey('produtividade', agenteId || 'all', startDate || 'all', endDate || 'all', groupBy);
            // TTL do cache: 30 min sem filtros, 5 min com filtros
            const cacheTtl = (agenteId || startDate || endDate) ? (5 * 60 * 1000) : (30 * 60 * 1000);
            cache.set(cacheKey, response, cacheTtl);
        }

        res.json(response);
    } catch (error) {
        console.error('Produtividade data error:', error);
        res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Buscar top agentes e dados comparativos
exports.getTopAgentes = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 5;
        const startDate = req.query.startDate || null;
        const endDate = req.query.endDate || null;
        const noCache = req.query._nocache === 'true' || req.query._t;

        console.log(`📥 Top Agentes - Request recebido: limit=${limit}, startDate=${startDate}, endDate=${endDate}`);

        // Verificar cache
        let cached = null;
        if (!noCache) {
            const cacheKey = cache.generateKey('topAgentes', limit, startDate || 'all', endDate || 'all');
            cached = cache.get(cacheKey);
            if (cached) {
                console.log(`📦 Top Agentes - Retornando do cache`);
                return res.json(cached);
            }
        }

        // Se não houver datas, usar últimos 3 meses por padrão
        let finalStartDate = startDate;
        let finalEndDate = endDate;
        
        if (!startDate || !endDate) {
            const now = new Date();
            finalEndDate = now.toISOString().split('T')[0];
            const threeMonthsAgo = new Date(now);
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            finalStartDate = threeMonthsAgo.toISOString().split('T')[0];
            console.log(`📅 Top Agentes - Usando últimos 3 meses: ${finalStartDate} até ${finalEndDate}`);
        }

        // Buscar top agentes
        const topAgentes = await RecebimentoCobradorModel.getTopAgentesPorPeriodo(
            finalStartDate,
            finalEndDate,
            limit
        );

        // Buscar dados por mês para cada agente
        const agenteIds = topAgentes.map(a => a.agente_id);
        const dadosPorMes = await RecebimentoCobradorModel.getProdutividadeAgentesPorMes(
            agenteIds,
            finalStartDate,
            finalEndDate
        );

        // Formatar dados para o gráfico
        // Agrupar por mês e incluir valores de cada agente
        const meses = new Set();
        dadosPorMes.forEach(item => {
            // Usar date_formatted se disponível, senão usar date
            const mesKey = item.date || item.date_formatted;
            if (mesKey) {
                meses.add(mesKey);
            }
        });
        const mesesOrdenados = Array.from(meses).sort();

        const dadosFormatados = mesesOrdenados.map(mes => {
            const dadosMes = {
                date: mes
            };
            
            topAgentes.forEach((agente, index) => {
                const dadosAgente = dadosPorMes.find(
                    d => d.agente_id === agente.agente_id && (d.date === mes || d.date_formatted === mes)
                );
                // Usar índice para manter ordem consistente
                const chave = `agente_${agente.agente_id}`;
                dadosMes[chave] = dadosAgente ? parseFloat(dadosAgente.valor_recebido || 0) : 0;
            });
            
            return dadosMes;
        });

        const response = {
            topAgentes: topAgentes,
            dadosPorMes: dadosFormatados,
            periodo: {
                startDate: finalStartDate,
                endDate: finalEndDate
            }
        };

        console.log(`📤 Top Agentes - Enviando resposta: ${topAgentes.length} agentes, ${dadosFormatados.length} meses`);

        // Armazenar no cache
        if (!noCache) {
            const cacheKey = cache.generateKey('topAgentes', limit, finalStartDate || 'all', finalEndDate || 'all');
            const cacheTtl = (finalStartDate || finalEndDate) ? (5 * 60 * 1000) : (30 * 60 * 1000);
            cache.set(cacheKey, response, cacheTtl);
        }

        res.json(response);
    } catch (error) {
        console.error('Top Agentes error:', error);
        res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

