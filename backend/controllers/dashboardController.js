const { getDB } = require('../config/db');
const BlocoModel = require('../models/blocoModel');
const PagamentoModel = require('../models/pagamentoModel');
const cache = require('../utils/cache');

// Initialize DB connection (will be reused)
let dbConnection = null;
const getDbConnection = async () => {
    if (!dbConnection) {
        dbConnection = await getDB();
    }
    return dbConnection;
};

// Função auxiliar para formatar dados do gráfico
// Agora os dados já vêm formatados como MM/YYYY do banco
const formatChartData = (data) => {
    return data.map(item => ({
        date: item.date || '',
        ...item,
        percent: item.percent || 0
    }));
};

// Buscar dados de um bloco específico (otimizado)
exports.getBlocoData = async (req, res) => {
    try {
        const blocoParam = req.params.bloco;
        const bloco = parseInt(blocoParam);
        
        if (isNaN(bloco) || ![1, 2, 3].includes(bloco)) {
            return res.status(400).json({ message: 'Bloco inválido. Use 1, 2 ou 3.' });
        }

        const startDate = req.query.startDate || null;
        const endDate = req.query.endDate || null;

        // Verificar cache
        const cacheKey = cache.generateKey('bloco', bloco, startDate || 'all', endDate || 'all');
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Buscar dados do bloco
        const blocoData = await BlocoModel.getBlocoData(bloco, startDate, endDate);

        // Formatar resposta
        const response = {
            spins: blocoData.spins,
            acionadosXCarteira: formatChartData(blocoData.acionadosXCarteira),
            acionadosXAlo: formatChartData(blocoData.acionadosXAlo),
            aloXCpc: formatChartData(blocoData.aloXCpc),
            cpcXCpca: formatChartData(blocoData.cpcXCpca),
            cpcaXAcordos: formatChartData(blocoData.cpcaXAcordos),
            acordosXPagamentos: formatChartData(blocoData.acordosXPagamentos)
        };

        // Armazenar no cache
        cache.set(cacheKey, response);

        res.json(response);
    } catch (error) {
        console.error('Bloco data error:', error);
        res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.getDashboardData = async (req, res) => {
    try {
        const db = await getDbConnection();
        
        if (!db) {
            return res.status(500).json({ message: 'Database connection failed' });
        }

        // Obter parâmetros de data (opcional)
        // Se não fornecido, busca todos os dados disponíveis
        const startDate = req.query.startDate || null;
        const endDate = req.query.endDate || null;

        // Verificar cache
        const cacheKey = cache.generateKey('dashboard', startDate || 'all', endDate || 'all');
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Verificar se é agrupamento por dia ou mês
        const groupBy = req.query.groupBy || 'month';

        // Buscar dados de todos os blocos em paralelo
        const [bloco1Data, bloco2Data, bloco3Data, woRecebimento, recebimento1, recebimento2, recebimento3, recebimentoWO] = await Promise.all([
            BlocoModel.getBlocoData(1, startDate, endDate),
            BlocoModel.getBlocoData(2, startDate, endDate),
            BlocoModel.getBlocoData(3, startDate, endDate),
            BlocoModel.getRecebimento('wo', startDate, endDate),
            PagamentoModel.getRecebimentoData(1, startDate, endDate, groupBy),
            PagamentoModel.getRecebimentoData(2, startDate, endDate, groupBy),
            PagamentoModel.getRecebimentoData(3, startDate, endDate, groupBy),
            PagamentoModel.getRecebimentoData('wo', startDate, endDate, groupBy)
        ]);

        // Estrutura do dashboard com dados reais
        const dashboardData = {
            totalSpins: bloco1Data.spins + bloco2Data.spins + bloco3Data.spins,
            spinsVariation: null, // Pode ser calculado comparando com período anterior
            eficienciaGlobal: 0, // Pode ser calculado baseado em métricas
            bloco1: {
                title: "BLOCO 1",
                spins: bloco1Data.spins,
                acionadosXCarteira: formatChartData(bloco1Data.acionadosXCarteira),
                acionadosXAlo: formatChartData(bloco1Data.acionadosXAlo),
                aloXCpc: formatChartData(bloco1Data.aloXCpc),
                cpcXCpca: formatChartData(bloco1Data.cpcXCpca),
                cpcaXAcordos: formatChartData(bloco1Data.cpcaXAcordos),
                acordosXPagamentos: formatChartData(bloco1Data.acordosXPagamentos)
            },
            bloco2: {
                title: "BLOCO 2",
                spins: bloco2Data.spins,
                acionadosXCarteira: formatChartData(bloco2Data.acionadosXCarteira),
                acionadosXAlo: formatChartData(bloco2Data.acionadosXAlo),
                aloXCpc: formatChartData(bloco2Data.aloXCpc),
                cpcXCpca: formatChartData(bloco2Data.cpcXCpca),
                cpcaXAcordos: formatChartData(bloco2Data.cpcaXAcordos),
                acordosXPagamentos: formatChartData(bloco2Data.acordosXPagamentos)
            },
            bloco3: {
                title: "BLOCO 3",
                spins: bloco3Data.spins,
                acionadosXCarteira: formatChartData(bloco3Data.acionadosXCarteira),
                acionadosXAlo: formatChartData(bloco3Data.acionadosXAlo),
                aloXCpc: formatChartData(bloco3Data.aloXCpc),
                cpcXCpca: formatChartData(bloco3Data.cpcXCpca),
                cpcaXAcordos: formatChartData(bloco3Data.cpcaXAcordos),
                acordosXPagamentos: formatChartData(bloco3Data.acordosXPagamentos)
            },
            financial: {
                bloco1: recebimento1.total,
                bloco2: recebimento2.total,
                bloco3: recebimento3.total,
                wo: recebimentoWO.total,
                total: recebimento1.total + recebimento2.total + recebimento3.total + recebimentoWO.total,
                chartData: [
                    { name: 'BLOCO 3', value: recebimento3.total, fill: '#3b82f6' },
                    { name: 'BLOCO 2', value: recebimento2.total, fill: '#64748b' },
                    { name: 'BLOCO 1', value: recebimento1.total, fill: '#f59e0b' },
                    { name: 'WO', value: recebimentoWO.total, fill: '#1e293b' },
                ],
                recebimentoPorMes: {
                    bloco1: recebimento1.porMes,
                    bloco2: recebimento2.porMes,
                    bloco3: recebimento3.porMes,
                    wo: recebimentoWO.porMes
                },
                recebimentoPorDia: {
                    bloco1: recebimento1.porDia,
                    bloco2: recebimento2.porDia,
                    bloco3: recebimento3.porDia,
                    wo: recebimentoWO.porDia
                }
            }
        };

        // Armazenar no cache
        cache.set(cacheKey, dashboardData);

        res.json(dashboardData);

    } catch (error) {
        console.error('Dashboard data error:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

