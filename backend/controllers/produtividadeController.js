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

        // Buscar top agentes do período geral (para resumo)
        const topAgentesPeriodo = await RecebimentoCobradorModel.getTopAgentesPorPeriodo(
            finalStartDate,
            finalEndDate,
            limit
        );

        // Gerar lista de meses no período
        const meses = [];
        const start = new Date(finalStartDate);
        const end = new Date(finalEndDate);
        
        // Garantir que processamos todos os meses, incluindo o mês final
        const startYear = start.getFullYear();
        const startMonth = start.getMonth() + 1; // getMonth() retorna 0-11
        const endYear = end.getFullYear();
        const endMonth = end.getMonth() + 1; // getMonth() retorna 0-11
        
        console.log(`📅 Gerando meses: ${startYear}-${startMonth} até ${endYear}-${endMonth}`);
        
        let currentYear = startYear;
        let currentMonth = startMonth;
        
        // Processar todos os meses do período, incluindo o mês final
        while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
            meses.push({
                ano: currentYear,
                mes: currentMonth,
                date: `${String(currentMonth).padStart(2, '0')}/${currentYear}`,
                dateKey: `${currentYear}-${String(currentMonth).padStart(2, '0')}`
            });
            
            console.log(`   ✅ Adicionado mês: ${currentYear}-${String(currentMonth).padStart(2, '0')} (${String(currentMonth).padStart(2, '0')}/${currentYear})`);
            
            // Avançar para o próximo mês
            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
        }
        
        console.log(`📊 Total de meses a processar: ${meses.length}`);

        // Buscar top agentes de cada mês e formatar dados
        const dadosFormatados = [];
        const todosAgentes = new Map(); // Para manter lista completa de agentes que apareceram em algum mês

        for (const mesInfo of meses) {
            console.log(`🔍 Buscando top agentes para ${mesInfo.date} (ano=${mesInfo.ano}, mes=${mesInfo.mes})`);
            
            // Buscar top agentes deste mês específico
            const topAgentesMes = await RecebimentoCobradorModel.getTopAgentesPorMes(
                mesInfo.ano,
                mesInfo.mes,
                limit
            );

            console.log(`   📊 Encontrados ${topAgentesMes.length} agentes para ${mesInfo.date}`);

            // Adicionar agentes ao mapa completo com seus nomes
            topAgentesMes.forEach(agente => {
                if (!todosAgentes.has(agente.agente_id)) {
                    todosAgentes.set(agente.agente_id, {
                        agente_id: agente.agente_id,
                        agente_nome: agente.agente_nome
                    });
                }
            });

            // Criar entrada do mês com apenas os top agentes deste mês
            const dadosMes = {
                date: mesInfo.date
            };

            topAgentesMes.forEach(agente => {
                const chave = `agente_${agente.agente_id}`;
                dadosMes[chave] = parseFloat(agente.valor_recebido || 0);
            });

            // Sempre adicionar o mês, mesmo que não tenha agentes (para aparecer no gráfico)
            dadosFormatados.push(dadosMes);
            
            console.log(`   ✅ Mês ${mesInfo.date} processado com ${Object.keys(dadosMes).filter(k => k.startsWith('agente_')).length} agentes`);
        }

        // Converter mapa de agentes para array (lista completa de todos os agentes que aparecem)
        const topAgentes = Array.from(todosAgentes.values());

        const response = {
            topAgentes: topAgentes, // Lista de todos os agentes únicos que aparecem em qualquer mês
            topAgentesPeriodo: topAgentesPeriodo, // Resumo do período geral (para tabela)
            dadosPorMes: dadosFormatados,
            periodo: {
                startDate: finalStartDate,
                endDate: finalEndDate
            }
        };

        console.log(`📤 Top Agentes - Enviando resposta: ${topAgentes.length} agentes, ${dadosFormatados.length} meses`);
        console.log(`📤 Meses incluídos na resposta: ${dadosFormatados.map(d => d.date).join(', ')}`);
        console.log(`📤 Detalhes dos meses:`);
        dadosFormatados.forEach((mes, idx) => {
            const agentesNoMes = Object.keys(mes).filter(k => k.startsWith('agente_')).length;
            console.log(`   ${idx + 1}. ${mes.date}: ${agentesNoMes} agentes`);
        });

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

