const jwt = require('jsonwebtoken');

// Middleware para verificar autenticação
const authenticate = (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;

        if (!token) {
            return res.status(401).json({ message: 'Token não fornecido' });
        }

        if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
            return res.status(500).json({ message: 'JWT_SECRET não configurado' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded; // Adicionar informações do usuário ao request
            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expirado' });
            } else if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Token inválido' });
            } else {
                return res.status(401).json({ message: 'Erro ao verificar token' });
            }
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Middleware para verificar se o usuário tem uma permissão específica
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        const userPermissions = req.user.permissions || [];
        
        if (!userPermissions.includes(permission)) {
            return res.status(403).json({ message: 'Permissão insuficiente' });
        }

        next();
    };
};

module.exports = {
    authenticate,
    requirePermission
};

