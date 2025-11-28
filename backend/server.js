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

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3002',
        'https://resultados.vuon.portes.com.br',
        'http://resultados.vuon.portes.com.br'
    ],
    credentials: true
}));
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
