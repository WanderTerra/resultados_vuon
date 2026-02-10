// Load .env first
const path = require('path');
const fs = require('fs');

// Tentar carregar .env do diretório backend
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log('✅ .env carregado de:', envPath);
} else {
    console.error('❌ Arquivo .env não encontrado em:', envPath);
    // Tentar do diretório raiz como fallback
    const rootEnvPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(rootEnvPath)) {
        require('dotenv').config({ path: rootEnvPath });
        console.log('✅ .env carregado de:', rootEnvPath);
    } else {
        console.error('❌ Arquivo .env não encontrado em:', rootEnvPath);
        // Tentar carregar sem especificar caminho (comportamento padrão)
        require('dotenv').config();
    }
}

// Validar variáveis de ambiente essenciais
const requiredEnvVars = ['JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName] || process.env[varName].trim() === '');

if (missingVars.length > 0) {
    console.error('❌ Variáveis de ambiente obrigatórias não encontradas ou vazias:');
    missingVars.forEach(varName => {
        console.error(`   - ${varName}`);
    });
    console.error('\n💡 Adicione essas variáveis ao arquivo .env na pasta backend/');
    console.error('   Exemplo: JWT_SECRET=seu-secret-key-aqui\n');
    process.exit(1);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    // Don't exit - keep server running
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    // Don't exit - keep server running
});

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const aloRoutes = require('./routes/aloRoutes');
const { updateMissingMonths } = require('./utils/updateBlocoSummary');
const { updateBlocoSpinsDaily } = require('./utils/updateBlocoSpinsDaily');
const { syncAgentesFromResultados } = require('./scripts/populateAgentesFromResultados');

const app = express();
const PORT = process.env.PORT || 3002;

// Lista de origens permitidas
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://resultados.vuon.portes.com.br',
    'http://resultados.vuon.portes.com.br'
];

// Middleware CORS - configurado ANTES de qualquer rota
const corsOptions = {
    origin: function (origin, callback) {
        // Permitir requisições sem origem (ex: Postman, mobile apps, curl)
        if (!origin) {
            return callback(null, true);
        }
        
        // Verificar se a origem está na lista de permitidas
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`⚠️  CORS bloqueado para origem: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 24 horas
};

app.use(cors(corsOptions));

app.use(express.json());

// Error handling middleware - garantir CORS mesmo em erros
app.use((err, req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.indexOf(origin) !== -1) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alo', aloRoutes);

// Health check
app.get('/', (req, res) => {
    res.send('Vuon Dashboard API is running');
});

// Horário do servidor — UTC e já em Campo Grande (UTC-3) para o front exibir igual em todos os PCs
app.get('/api/server-time', (req, res) => {
    const now = new Date();
    let h = now.getUTCHours() - 3;
    if (h < 0) h += 24;
    const m = now.getUTCMinutes();
    const s = now.getUTCSeconds();
    res.json({
        utc: Number(Date.now()),
        h: Number(h),
        m: Number(m),
        s: Number(s)
    });
});

const server = app.listen(PORT, async () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/`);
    console.log(`   API endpoint: http://localhost:${PORT}/api/auth/login`);
    console.log(`\n   Press Ctrl+C to stop the server\n`);
    
    // Atualizar tabela materializada na inicialização (não bloqueia)
    updateMissingMonths().catch(err => {
        console.error('⚠️  Erro ao atualizar bloco_summary:', err.message);
    });

    // Atualizar spins diários (até ontem) na inicialização (não bloqueia)
    updateBlocoSpinsDaily(true).catch(err => {
        console.error('⚠️  Erro ao atualizar bloco_spins_diario:', err.message);
    });

    // Sincronizar agentes da tabela vuon_resultados (não bloqueia)
    syncAgentesFromResultados(true).catch(err => {
        console.error('⚠️  Erro ao sincronizar agentes:', err.message);
    });
    
    // Configurar verificação periódica
    // Pode ser configurado via variável de ambiente UPDATE_INTERVAL_HOURS (padrão: 1 hora)
    const UPDATE_INTERVAL_HOURS = parseInt(process.env.UPDATE_INTERVAL_HOURS) || 1;
    const UPDATE_INTERVAL_MS = UPDATE_INTERVAL_HOURS * 60 * 60 * 1000;
    
    console.log(`🔄 Verificação automática de meses faltantes configurada: a cada ${UPDATE_INTERVAL_HOURS} hora(s)\n`);
    
    const periodicUpdate = setInterval(() => {
        const now = new Date().toLocaleString('pt-BR');
        console.log(`\n⏰ [${now}] Verificação periódica de meses faltantes iniciada...`);
        updateMissingMonths(true).catch(err => {
            console.error('⚠️  Erro na verificação periódica de bloco_summary:', err.message);
        });

        // Spins diários (até ontem)
        updateBlocoSpinsDaily(true).catch(err => {
            console.error('⚠️  Erro na verificação periódica de bloco_spins_diario:', err.message);
        });

        // Sincronizar agentes (modo silencioso)
        syncAgentesFromResultados(true).catch(err => {
            console.error('⚠️  Erro na sincronização periódica de agentes:', err.message);
        });
    }, UPDATE_INTERVAL_MS);
    
    // Limpar intervalo quando o servidor for encerrado
    process.on('SIGTERM', () => {
        clearInterval(periodicUpdate);
    });
    
    process.on('SIGINT', () => {
        clearInterval(periodicUpdate);
    });
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        console.error(`   Try using a different port or stop the process using port ${PORT}`);
    } else {
        console.error('❌ Server error:', error);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\nSIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
