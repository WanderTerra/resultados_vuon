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

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware CORS
const corsOptions = {
    origin: function (origin, callback) {
        // Lista de origens permitidas
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3002',
            'https://resultados.vuon.portes.com.br',
            'http://resultados.vuon.portes.com.br'
        ];
        
        // Permitir requisições sem origem (ex: Postman, mobile apps)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`⚠️  CORS bloqueado para origem: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 24 horas
};

app.use(cors(corsOptions));

// Middleware para adicionar headers CORS manualmente (backup)
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3002',
        'https://resultados.vuon.portes.com.br',
        'http://resultados.vuon.portes.com.br'
    ];
    
    // Log para debug (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
        console.log(`📡 Request from origin: ${origin || 'no origin'}`);
    }
    
    if (origin && allowedOrigins.indexOf(origin) !== -1) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
        // Permitir requisições sem origem (ex: Postman, curl)
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Authorization');
    
    // Responder imediatamente a requisições OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
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

const server = app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/`);
    console.log(`   API endpoint: http://localhost:${PORT}/api/auth/login`);
    console.log(`\n   Press Ctrl+C to stop the server\n`);
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
