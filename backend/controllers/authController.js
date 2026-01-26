const { getDB } = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Initialize DB connection (will be reused)
let dbConnection = null;
const getDbConnection = async () => {
    if (!dbConnection) {
        dbConnection = await getDB();
    }
    return dbConnection;
};

exports.login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        // Get database connection
        const db = await getDbConnection();
        
        if (!db) {
            console.error('Database connection is null');
            return res.status(500).json({ message: 'Database connection failed' });
        }
        
        // 1. Find user
        const [users] = await db.execute('SELECT * FROM usuarios WHERE username = ?', [username]);

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];

        // 2. Check password
        // Note: In a real app, you MUST use bcrypt.compare. 
        // If your existing database has plain text passwords, you might need to adjust this.
        // Assuming hashed passwords for now as per table definition (password_hash).
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.status !== 'ativo') {
            return res.status(403).json({ message: 'User account is inactive' });
        }

        // 3. Get permissions
        const [permissions] = await db.execute(`
            SELECT p.codigo 
            FROM permissoes p
            JOIN usuario_permissao up ON p.id = up.permissao_id
            WHERE up.usuario_id = ?
        `, [user.id]);

        const permissionCodes = permissions.map(p => p.codigo);

        // 4. Generate Token
        if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
            console.error('❌ JWT_SECRET não está definido ou está vazio');
            return res.status(500).json({ 
                message: 'Server configuration error',
                error: 'JWT_SECRET is not configured'
            });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, permissions: permissionCodes },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                nome: user.nome,
                permissions: permissionCodes
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            code: process.env.NODE_ENV === 'development' ? error.code : undefined
        });
    }
};

// Verificar se o token é válido
exports.verifyToken = async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;

        if (!token) {
            return res.status(401).json({ valid: false, message: 'Token não fornecido' });
        }

        if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
            return res.status(500).json({ valid: false, message: 'JWT_SECRET não configurado' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            res.json({ 
                valid: true, 
                user: {
                    id: decoded.id,
                    username: decoded.username,
                    permissions: decoded.permissions
                }
            });
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ valid: false, message: 'Token expirado' });
            } else if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({ valid: false, message: 'Token inválido' });
            } else {
                return res.status(401).json({ valid: false, message: 'Erro ao verificar token' });
            }
        }
    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({ 
            valid: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Criar novo usuário (requer permissão cadastrar_usuario)
exports.createUser = async (req, res) => {
    try {
        // A verificação de permissão já foi feita pelo middleware requirePermission

        const { username, password, nome, status = 'ativo', isAdmin = false } = req.body;

        // Validações
        if (!username || !password || !nome) {
            return res.status(400).json({ 
                message: 'Username, password e nome são obrigatórios' 
            });
        }

        if (username.length < 3) {
            return res.status(400).json({ 
                message: 'Username deve ter pelo menos 3 caracteres' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                message: 'Senha deve ter pelo menos 6 caracteres' 
            });
        }

        if (nome.length < 3) {
            return res.status(400).json({ 
                message: 'Nome deve ter pelo menos 3 caracteres' 
            });
        }

        // Get database connection
        const db = await getDbConnection();
        
        if (!db) {
            return res.status(500).json({ message: 'Database connection failed' });
        }

        // Verificar se o usuário já existe
        const [existingUsers] = await db.execute(
            'SELECT id FROM usuarios WHERE username = ?',
            [username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ 
                message: 'Usuário já existe' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Inserir usuário
        const [result] = await db.execute(
            'INSERT INTO usuarios (username, password_hash, nome, status) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, nome, status]
        );

        const novoUsuarioId = result.insertId;

        // Se for admin, atribuir permissões
        if (isAdmin) {
            console.log(`🔐 Atribuindo permissões de admin ao usuário ${username}...`);
            
            // Buscar IDs das permissões de admin
            const [permissoesAdmin] = await db.execute(`
                SELECT id FROM permissoes 
                WHERE codigo IN ('cadastrar_usuario', 'cadastrar_agentes')
            `);

            // Atribuir permissões
            for (const permissao of permissoesAdmin) {
                try {
                    await db.execute(
                        'INSERT INTO usuario_permissao (usuario_id, permissao_id) VALUES (?, ?)',
                        [novoUsuarioId, permissao.id]
                    );
                    console.log(`   ✅ Permissão ID ${permissao.id} atribuída`);
                } catch (error) {
                    if (error.code !== 'ER_DUP_ENTRY') {
                        console.error(`   ⚠️  Erro ao atribuir permissão:`, error.message);
                    }
                }
            }
        }

        res.status(201).json({
            message: 'Usuário criado com sucesso',
            user: {
                id: novoUsuarioId,
                username: username,
                nome: nome,
                status: status,
                isAdmin: isAdmin
            }
        });

    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};