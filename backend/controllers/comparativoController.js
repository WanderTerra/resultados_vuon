const ComparativoModel = require('../models/comparativoModel');

/**
 * Busca dados comparativos entre múltiplos períodos
 * Query params:
 * - periodos: JSON array de períodos [{startDate, endDate, nome}, ...] OU
 * - startDate1, endDate1, startDate2, endDate2 (modo legado para 2 períodos)
 * - bloco: 1, 2, 3, 'wo' ou 'all' (opcional)
 * - clientesVirgens: true/false (opcional)
 * - agenteId: ID do agente (opcional)
 * - groupBy: 'day', 'week' ou 'month' (padrão: 'day')
 */
exports.getComparativo = async (req, res) => {
    try {
        const {
            periodos,
            startDate1,
            endDate1,
            startDate2,
            endDate2,
            bloco = 'all',
            clientesVirgens = false,
            agenteId = null,
            groupBy = 'day'
        } = req.query;

        // Processar períodos: aceitar array JSON ou modo legado (2 períodos)
        let periodosArray = [];
        
        if (periodos) {
            // Modo novo: array de períodos
            try {
                periodosArray = JSON.parse(periodos);
                if (!Array.isArray(periodosArray) || periodosArray.length === 0) {
                    return res.status(400).json({
                        message: 'periodos deve ser um array JSON não vazio de objetos {startDate, endDate, nome}'
                    });
                }
                // Validar cada período
                for (const periodo of periodosArray) {
                    if (!periodo.startDate || !periodo.endDate) {
                        return res.status(400).json({
                            message: 'Cada período deve ter startDate e endDate'
                        });
                    }
                }
            } catch (error) {
                return res.status(400).json({
                    message: 'periodos deve ser um JSON válido'
                });
            }
        } else if (startDate1 && endDate1 && startDate2 && endDate2) {
            // Modo legado: 2 períodos
            periodosArray = [
                { startDate: startDate1, endDate: endDate1, nome: 'Período 1' },
                { startDate: startDate2, endDate: endDate2, nome: 'Período 2' }
            ];
        } else {
            return res.status(400).json({
                message: 'Forneça periodos (array JSON) ou startDate1/endDate1/startDate2/endDate2'
            });
        }

        // Validar groupBy
        if (!['day', 'week', 'month'].includes(groupBy)) {
            return res.status(400).json({
                message: 'groupBy deve ser "day", "week" ou "month"'
            });
        }

        // Converter clientesVirgens para boolean
        const clientesVirgensBool = clientesVirgens === 'true' || clientesVirgens === true;

        // Converter agenteId para número ou null
        const agenteIdNum = agenteId ? parseInt(agenteId) : null;

        console.log(`📊 Comparativo - Request recebido:`);
        console.log(`   ${periodosArray.length} período(s) para comparar`);
        periodosArray.forEach((p, i) => {
            console.log(`   Período ${i + 1} (${p.nome || `Período ${i + 1}`}): ${p.startDate} até ${p.endDate}`);
        });
        console.log(`   Bloco: ${bloco}, Clientes Virgens: ${clientesVirgensBool}, Agente: ${agenteIdNum}, GroupBy: ${groupBy}`);

        // Converter bloco para número se for string numérica
        let blocoFinal = null;
        if (bloco && bloco !== 'all') {
            if (bloco === 'wo') {
                blocoFinal = 'wo';
            } else {
                const blocoNum = parseInt(bloco);
                blocoFinal = isNaN(blocoNum) ? null : blocoNum;
            }
        }

        const filters = {
            bloco: blocoFinal,
            clientesVirgens: clientesVirgensBool,
            agenteId: agenteIdNum,
            groupBy
        };

        const dados = await ComparativoModel.getComparativoMultiplos(
            filters,
            periodosArray
        );

        console.log(`✅ Comparativo - Dados retornados:`);
        dados.periodos.forEach((p, i) => {
            console.log(`   Período ${i + 1} (${p.nome}): ${p.dados.length} registros`);
        });

        // Se não houver dados, buscar período disponível no banco
        const totalRegistros = dados.periodos.reduce((sum, p) => sum + p.dados.length, 0);
        if (totalRegistros === 0) {
            try {
                const periodoDisponivel = await ComparativoModel.getPeriodoDisponivel();
                dados.periodoDisponivel = periodoDisponivel;
            } catch (error) {
                console.error('Erro ao buscar período disponível:', error);
            }
        }

        res.json(dados);
    } catch (error) {
        console.error('❌ Erro ao buscar comparativo:', error);
        res.status(500).json({
            message: 'Erro ao buscar dados comparativos',
            error: error.message
        });
    }
};

/**
 * Lista todos os agentes disponíveis
 */
exports.getAgentes = async (req, res) => {
    try {
        const agentes = await ComparativoModel.getAgentesList();
        res.json(agentes);
    } catch (error) {
        console.error('❌ Erro ao buscar agentes:', error);
        res.status(500).json({
            message: 'Erro ao buscar lista de agentes',
            error: error.message
        });
    }
};

