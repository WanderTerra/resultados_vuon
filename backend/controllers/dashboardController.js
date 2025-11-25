const { getDB } = require('../config/db');

// Initialize DB connection (will be reused)
let dbConnection = null;
const getDbConnection = async () => {
    if (!dbConnection) {
        dbConnection = await getDB();
    }
    return dbConnection;
};

exports.getDashboardData = async (req, res) => {
    try {
        const db = await getDbConnection();
        
        if (!db) {
            return res.status(500).json({ message: 'Database connection failed' });
        }

        // Estrutura base do dashboard
        const dashboardData = {
            totalSpins: 0,
            spinsVariation: null,
            eficienciaGlobal: 0,
            bloco1: {
                title: "BLOCO 1",
                spins: 0,
                acionadosXCarteira: [],
                acionadosXAlo: [],
                aloXCpc: [],
                cpcXCpca: [],
                cpcaXAcordos: [],
                acordosXPagamentos: []
            },
            bloco2: {
                title: "BLOCO 2",
                spins: 0,
                acionadosXCarteira: [],
                acionadosXAlo: [],
                aloXCpc: [],
                cpcXCpca: [],
                cpcaXAcordos: [],
                acordosXPagamentos: []
            },
            bloco3: {
                title: "BLOCO 3",
                spins: 0,
                acionadosXCarteira: [],
                acionadosXAlo: [],
                aloXCpc: [],
                cpcXCpca: [],
                cpcaXAcordos: [],
                acordosXPagamentos: []
            },
            financial: {
                bloco1: 0,
                bloco2: 0,
                bloco3: 0,
                wo: 0,
                total: 0,
                chartData: []
            }
        };

        // Verificar se há dados na tabela vuon_resultados
        const [resultados] = await db.execute('SELECT COUNT(*) as total FROM vuon_resultados');
        const totalRegistros = resultados[0].total;

        if (totalRegistros > 0) {
            // Calcular total de spins (soma dos spins dos 3 blocos)
            dashboardData.totalSpins = dashboardData.bloco1.spins + dashboardData.bloco2.spins + dashboardData.bloco3.spins;
            
            // Calcular eficiência global (será calculada quando houver dados reais)
            // Por enquanto, 0%
            dashboardData.eficienciaGlobal = 0;
            
            // Preparar dados do gráfico financeiro
            dashboardData.financial.chartData = [
                { name: 'BLOCO 3', value: dashboardData.financial.bloco3, fill: '#3b82f6' },
                { name: 'BLOCO 2', value: dashboardData.financial.bloco2, fill: '#64748b' },
                { name: 'BLOCO 1', value: dashboardData.financial.bloco1, fill: '#f59e0b' },
                { name: 'WO', value: dashboardData.financial.wo, fill: '#1e293b' },
            ];
        }

        res.json(dashboardData);

    } catch (error) {
        console.error('Dashboard data error:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

