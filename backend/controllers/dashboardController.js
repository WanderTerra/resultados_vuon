const { getDB } = require('../config/db');
const BlocoModel = require('../models/blocoModel');
const PagamentoModel = require('../models/pagamentoModel');
const DiarioBordoModel = require('../models/diarioBordoModel');
const ClientesVirgensModel = require('../models/clientesVirgensModel');
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
        // Aceitar 'wo' ou números 1, 2, 3
        let bloco;
        if (blocoParam === 'wo' || blocoParam === 'WO') {
            bloco = 'wo';
        } else {
            bloco = parseInt(blocoParam);
            if (isNaN(bloco) || ![1, 2, 3].includes(bloco)) {
                return res.status(400).json({ message: 'Bloco inválido. Use 1, 2, 3 ou wo.' });
            }
        }

        const startDate = req.query.startDate || null;
        const endDate = req.query.endDate || null;
        const groupBy = req.query.groupBy || 'month'; // 'day' ou 'month'
        const noCache = req.query._nocache === 'true' || req.query._t; // Ignorar cache se _nocache=true ou se houver timestamp

        console.log(`📥 Bloco ${bloco} - Request recebido: startDate=${startDate}, endDate=${endDate}, groupBy=${groupBy}`);

        // Verificar cache apenas se não houver flag para ignorar cache
        let cached = null;
        if (!noCache) {
            const cacheKey = cache.generateKey('bloco', bloco, startDate || 'all', endDate || 'all', groupBy);
            cached = cache.get(cacheKey);
            if (cached) {
                console.log(`📦 Bloco ${bloco} - Retornando do cache`);
                // Mesmo do cache, mostrar valores para debug
                if (cached.acionadosXCarteira && cached.acionadosXCarteira.length > 0) {
                    console.log(`📊 Bloco ${bloco} - DADOS DO CACHE:`);
                    cached.acionadosXCarteira.forEach(r => {
                        console.log(`   ${r.date}: Carteira=${r.carteira?.toLocaleString() || r.carteira}, Acionados=${r.acionados?.toLocaleString() || r.acionados}, %=${r.percent || 0}%`);
                    });
                }
                return res.json(cached);
            }
        } else {
            // Se houver filtros de data, limpar cache relacionado ao bloco para evitar dados antigos
            if (startDate || endDate) {
                const cachePrefix = `bloco:${bloco}:`;
                const cleared = cache.clearByPrefix(cachePrefix);
                console.log(`🗑️  Bloco ${bloco} - ${cleared} entradas de cache limpas para evitar dados antigos`);
            }
        }

        // Buscar dados do bloco
        const blocoData = await BlocoModel.getBlocoData(bloco, startDate, endDate, groupBy);

        // Formatar resposta
        const response = {
            spins: blocoData.spins,
            spinsLastDay: blocoData.spinsLastDay,
            spinsLastDayDate: blocoData.spinsLastDayDate,
            acionadosXCarteira: formatChartData(blocoData.acionadosXCarteira),
            acionadosXAlo: formatChartData(blocoData.acionadosXAlo),
            aloXCpc: formatChartData(blocoData.aloXCpc),
            cpcXCpca: formatChartData(blocoData.cpcXCpca),
            cpcaXAcordos: formatChartData(blocoData.cpcaXAcordos),
            acordosXPagamentos: formatChartData(blocoData.acordosXPagamentos)
        };


        console.log(`📤 Bloco ${bloco} - Enviando resposta: ${response.acionadosXCarteira.length} meses/dias`);
        if (response.acionadosXCarteira.length > 0) {
            const firstFew = response.acionadosXCarteira.slice(0, 5);
            console.log(`📤 Primeiros: ${firstFew.map(r => `${r.date} (C:${r.carteira}, A:${r.acionados}, %:${r.percent})`).join(', ')}`);

            // Log detalhado de TODOS os meses para debug
            console.log(`\n📊 Bloco ${bloco} - DETALHAMENTO COMPLETO:`);
            response.acionadosXCarteira.forEach(r => {
                console.log(`   ${r.date}: Carteira=${r.carteira.toLocaleString()}, Acionados=${r.acionados.toLocaleString()}, %=${r.percent}%`);
            });
            console.log('');
        }

        // Armazenar no cache apenas se não houver flag para ignorar cache
        if (!noCache) {
            const cacheKey = cache.generateKey('bloco', bloco, startDate || 'all', endDate || 'all', groupBy);
            // TTL do cache: 1 hora sem filtros, 30 minutos com filtros
            // COUNT(DISTINCT) é muito lento, então cache longo é essencial
            const cacheTtl = (startDate || endDate) ? (30 * 60 * 1000) : (60 * 60 * 1000); // 30 min com filtros, 1 hora sem filtros
            cache.set(cacheKey, response, cacheTtl);
        }

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
        const noCache = req.query._nocache === 'true' || req.query._t; // Ignorar cache se _nocache=true ou se houver timestamp

        // Verificar cache apenas se não houver flag para ignorar cache
        let cached = null;
        if (!noCache) {
            const cacheKey = cache.generateKey('dashboard', startDate || 'all', endDate || 'all');
            cached = cache.get(cacheKey);
            if (cached) {
                return res.json(cached);
            }
        } else {
            // Se houver filtros de data, limpar cache relacionado ao dashboard
            if (startDate || endDate) {
                const cachePrefix = 'dashboard:';
                const cleared = cache.clearByPrefix(cachePrefix);
                console.log(`🗑️  Dashboard - ${cleared} entradas de cache limpas para evitar dados antigos`);
            }
        }

        // Verificar se é agrupamento por dia ou mês
        const groupBy = req.query.groupBy || 'month';

        // OTIMIZAÇÃO: Passar groupBy explicitamente para usar tabela materializada
        console.log(`📊 Dashboard - Buscando dados: startDate=${startDate}, endDate=${endDate}, groupBy=${groupBy}`);
        const dashboardStart = Date.now();

        // Buscar dados de todos os blocos em paralelo
        const [bloco1Data, bloco2Data, bloco3Data, woRecebimento, recebimento1, recebimento2, recebimento3, recebimentoWO] = await Promise.all([
            BlocoModel.getBlocoData(1, startDate, endDate, groupBy),
            BlocoModel.getBlocoData(2, startDate, endDate, groupBy),
            BlocoModel.getBlocoData(3, startDate, endDate, groupBy),
            BlocoModel.getRecebimento('wo', startDate, endDate),
            PagamentoModel.getRecebimentoData(1, startDate, endDate, groupBy),
            PagamentoModel.getRecebimentoData(2, startDate, endDate, groupBy),
            PagamentoModel.getRecebimentoData(3, startDate, endDate, groupBy),
            PagamentoModel.getRecebimentoData('wo', startDate, endDate, groupBy)
        ]);

        const dashboardTime = Date.now() - dashboardStart;
        console.log(`⏱️  Dashboard - Todas as queries executadas em ${(dashboardTime / 1000).toFixed(2)}s (${dashboardTime}ms)`);

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

        // Armazenar no cache apenas se não houver flag para ignorar cache
        if (!noCache) {
            const cacheKey = cache.generateKey('dashboard', startDate || 'all', endDate || 'all');
            // Reduzir TTL quando há filtros de data
            const cacheTtl = (startDate || endDate) ? (5 * 60 * 1000) : (30 * 60 * 1000); // 5 min com filtros, 30 min sem filtros
            cache.set(cacheKey, dashboardData, cacheTtl);
        }

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

// Buscar dados do diário de bordo (acordos por hora)
// Aceita três modos:
// 1. ?data=YYYY-MM-DD - busca dados de uma data específica
// 2. ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD - busca dados de um período
// 3. Sem parâmetros - busca o dia mais recente
exports.getDiarioBordo = async (req, res) => {
    try {
        const dataSelecionada = req.query.data || null; // Parâmetro opcional: ?data=2025-05-05
        const startDate = req.query.startDate || null;
        const endDate = req.query.endDate || null;

        // Se houver startDate e endDate, usar modo de período
        if (startDate && endDate) {
            // Cache com chave baseada no período
            const cacheKey = cache.generateKey('diarioBordo', 'periodo', startDate, endDate);
            const cached = cache.get(cacheKey);
            if (cached) {
                return res.json(cached);
            }

            // Buscar dados de todos os blocos para o período
            const data = await DiarioBordoModel.getAcordosPorHora(null, startDate, endDate);

            // Se não houver dados, retornar resposta vazia
            if (!data || data.length === 0) {
                const response = {
                    data: [],
                    startDate: startDate,
                    endDate: endDate,
                    total: 0,
                    totalPorBloco: {
                        bloco1: 0,
                        bloco2: 0,
                        bloco3: 0,
                        blocowo: 0
                    }
                };
                cache.set(cacheKey, response, 300);
                return res.json(response);
            }

            // Formatar dados para o gráfico - agrupar por data e hora
            const horasMap = new Map();

            data.forEach(row => {
                const hora = row.hora !== null && row.hora !== undefined ? parseInt(row.hora) : 0;
                const dataStr = row.data instanceof Date
                    ? row.data.toISOString().split('T')[0]
                    : (typeof row.data === 'string' ? row.data.split('T')[0] : String(row.data));

                const key = `${dataStr}_${hora}`;

                if (!horasMap.has(key)) {
                    horasMap.set(key, {
                        data: dataStr,
                        hora: hora,
                        horaFormatada: `${String(hora).padStart(2, '0')}:00`,
                        dda: 0,
                        acd: 0,
                        total: 0
                    });
                }

                const entry = horasMap.get(key);
                entry.dda += parseInt(row.dda || 0);
                entry.acd += parseInt(row.acd || 0);
                entry.total += parseInt(row.total_acordos || 0);
            });

            // Converter para array e ordenar
            const formattedData = Array.from(horasMap.values())
                .sort((a, b) => {
                    if (a.data !== b.data) return a.data.localeCompare(b.data);
                    return a.hora - b.hora;
                });

            // Calcular totais por bloco (buscar de cada bloco separadamente)
            const [bloco1Data, bloco2Data, bloco3Data, blocoWOData] = await Promise.all([
                DiarioBordoModel.getAcordosPorHora(1, startDate, endDate),
                DiarioBordoModel.getAcordosPorHora(2, startDate, endDate),
                DiarioBordoModel.getAcordosPorHora(3, startDate, endDate),
                DiarioBordoModel.getAcordosPorHora('wo', startDate, endDate)
            ]);

            const calcularTotal = (data) => {
                return data.reduce((sum, row) => sum + parseInt(row.total_acordos || 0), 0);
            };

            const response = {
                data: formattedData,
                startDate: startDate,
                endDate: endDate,
                total: formattedData.reduce((sum, item) => sum + item.total, 0),
                totalPorBloco: {
                    bloco1: calcularTotal(bloco1Data),
                    bloco2: calcularTotal(bloco2Data),
                    bloco3: calcularTotal(bloco3Data),
                    blocowo: calcularTotal(blocoWOData)
                }
            };

            // Armazenar no cache
            cache.set(cacheKey, response, 300); // 5 minutos de cache

            return res.json(response);
        }

        // Modo original: data específica ou dia mais recente
        // Cache com chave baseada na data selecionada ou "diaMaisRecente"
        const cacheKey = cache.generateKey('diarioBordo', dataSelecionada || 'diaMaisRecente');
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Buscar dados de todos os blocos da data selecionada ou do dia mais recente
        const data = await DiarioBordoModel.getAcordosPorHoraTodosBlocos(dataSelecionada);

        // Verificar se a data foi alterada automaticamente
        let dataUsada = dataSelecionada;
        let dataAlterada = false;

        if (data && data._dataAlterada) {
            dataUsada = data._dataUsada;
            dataAlterada = true;
            // Remover propriedades auxiliares
            delete data._dataAlterada;
            delete data._dataOriginal;
            delete data._dataUsada;
        }

        // Se não houver dados, retornar resposta vazia
        if (!data || data.length === 0) {
            const response = {
                data: [],
                dataReferencia: dataSelecionada || null,
                dataAlterada: false,
                total: 0
            };
            cache.set(cacheKey, response, 300);
            return res.json(response);
        }

        // Formatar dados para o gráfico
        // Agrupar por hora e separar por blocos
        const horasMap = new Map();

        // Obter a data do primeiro registro (todos serão do mesmo dia)
        let dataReferencia = dataUsada || null;

        data.forEach(row => {
            const hora = row.hora !== null && row.hora !== undefined ? parseInt(row.hora) : 0;

            // Capturar a data de referência (primeira vez)
            if (!dataReferencia && row.data) {
                if (row.data instanceof Date) {
                    dataReferencia = row.data.toISOString().split('T')[0];
                } else if (typeof row.data === 'string') {
                    dataReferencia = row.data.split('T')[0];
                } else {
                    dataReferencia = String(row.data);
                }
            }

            const key = hora; // Usar apenas a hora como chave, já que é tudo do mesmo dia
            const blocoKey = row.bloco !== null && row.bloco !== undefined ? String(row.bloco) : 'outros';

            if (!horasMap.has(key)) {
                horasMap.set(key, {
                    data: dataReferencia,
                    hora: hora,
                    horaFormatada: `${String(hora).padStart(2, '0')}:00`,
                    blocos: {}
                });
            }

            const entry = horasMap.get(key);
            entry.blocos[`bloco${blocoKey}`] = {
                dda: parseInt(row.dda || 0),
                acd: parseInt(row.acd || 0),
                total: parseInt(row.total_acordos || 0)
            };
        });

        // Converter para array e ordenar apenas por hora (já que é tudo do mesmo dia)
        const formattedData = Array.from(horasMap.values())
            .sort((a, b) => a.hora - b.hora);

        const response = {
            data: formattedData,
            dataReferencia: dataReferencia,
            dataAlterada: dataAlterada,
            dataOriginal: dataAlterada ? dataSelecionada : null,
            total: formattedData.reduce((sum, item) => {
                return sum + Object.values(item.blocos).reduce((blocoSum, bloco) => {
                    return blocoSum + (bloco.total || 0);
                }, 0);
            }, 0)
        };

        // Armazenar no cache (com TTL menor, pois é do dia atual)
        cache.set(cacheKey, response, 300); // 5 minutos de cache

        res.json(response);
    } catch (error) {
        console.error('Diário de bordo error:', error);
        res.status(500).json({
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Buscar dados de clientes virgens
exports.getClientesVirgens = async (req, res) => {
    try {
        const blocoParam = req.query.bloco;
        const startDate = req.query.startDate || null;
        const endDate = req.query.endDate || null;
        
        // Converter parâmetro de bloco
        let bloco = null;
        if (blocoParam) {
            if (blocoParam === 'wo' || blocoParam === 'WO') {
                bloco = 'wo';
            } else {
                const blocoNum = parseInt(blocoParam);
                if (!isNaN(blocoNum) && [1, 2, 3].includes(blocoNum)) {
                    bloco = blocoNum;
                } else {
                    return res.status(400).json({ message: 'Bloco inválido. Use 1, 2, 3 ou wo.' });
                }
            }
        }
        
        // IMPORTANTE: Passar startDate e endDate para garantir que os filtros sejam aplicados
        // da mesma forma que no gráfico "Acordos x Pagamentos"
        const data = await ClientesVirgensModel.getClientesVirgens(bloco, startDate, endDate);
        
        res.json({ data });
    } catch (error) {
        console.error('Clientes virgens error:', error);
        console.error('Error stack:', error.stack);
        console.error('Request params:', { bloco: req.query.bloco, startDate: req.query.startDate, endDate: req.query.endDate });
        res.status(500).json({
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Spins do último dia (ontem; fallback para último dia disponível)
exports.getSpinsLastDay = async (req, res) => {
    try {
        const noCache = req.query._nocache === 'true' || req.query._t;
        const cacheKey = cache.generateKey('spins-last-day');

        if (!noCache) {
            const cached = cache.get(cacheKey);
            if (cached) {
                return res.json(cached);
            }
        }

        const data = await BlocoModel.getLastDaySpinsAll();
        const response = { data };

        // Cache curto: é dado do "último dia" e muda no máximo 1x/dia
        cache.set(cacheKey, response, 5 * 60 * 1000); // 5 minutos
        res.json(response);
    } catch (error) {
        console.error('Spins last day error:', error);
        res.status(500).json({
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

