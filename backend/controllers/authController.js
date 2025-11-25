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
