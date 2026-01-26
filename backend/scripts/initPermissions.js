const { getDB } = require('../config/db');

/**
 * Script para inicializar permissões e atribuir ao usuário admin
 */
const initPermissions = async () => {
    try {
        console.log('🔄 Inicializando permissões...');

        const db = await getDB();

        // Definir permissões do sistema
        const permissoes = [
            { codigo: 'cadastrar_usuario', descricao: 'Permissão para cadastrar novos usuários' },
            { codigo: 'cadastrar_agentes', descricao: 'Permissão para cadastrar e gerenciar agentes' }
        ];

        // Criar permissões se não existirem
        console.log('📝 Criando permissões...');
        for (const permissao of permissoes) {
            try {
                await db.execute(
                    `INSERT INTO permissoes (codigo, descricao) VALUES (?, ?)`,
                    [permissao.codigo, permissao.descricao]
                );
                console.log(`   ✅ Permissão "${permissao.codigo}" criada`);
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    console.log(`   ℹ️  Permissão "${permissao.codigo}" já existe`);
                } else {
                    throw error;
                }
            }
        }

        // Buscar ID do usuário "Portes admin"
        console.log('\n👤 Buscando usuário "Portes admin"...');
        const [adminUsers] = await db.execute(
            'SELECT id FROM usuarios WHERE username = ?',
            ['Portes admin']
        );

        if (adminUsers.length === 0) {
            console.log('   ⚠️  Usuário "Portes admin" não encontrado.');
            console.log('   💡 Execute primeiro: npm run create-user');
            process.exit(0);
        }

        const adminId = adminUsers[0].id;
        console.log(`   ✅ Usuário encontrado (ID: ${adminId})`);

        // Buscar IDs das permissões
        console.log('\n🔍 Buscando IDs das permissões...');
        const permissaoIds = {};
        for (const permissao of permissoes) {
            const [rows] = await db.execute(
                'SELECT id FROM permissoes WHERE codigo = ?',
                [permissao.codigo]
            );
            if (rows.length > 0) {
                permissaoIds[permissao.codigo] = rows[0].id;
                console.log(`   ✅ ${permissao.codigo}: ID ${rows[0].id}`);
            }
        }

        // Atribuir todas as permissões ao admin
        console.log('\n🔗 Atribuindo permissões ao usuário admin...');
        let atribuidas = 0;
        for (const [codigo, permissaoId] of Object.entries(permissaoIds)) {
            try {
                await db.execute(
                    `INSERT INTO usuario_permissao (usuario_id, permissao_id) VALUES (?, ?)`,
                    [adminId, permissaoId]
                );
                console.log(`   ✅ Permissão "${codigo}" atribuída ao admin`);
                atribuidas++;
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    console.log(`   ℹ️  Permissão "${codigo}" já está atribuída ao admin`);
                } else {
                    throw error;
                }
            }
        }

        console.log('\n✅ Permissões inicializadas com sucesso!');
        console.log(`   📊 Total de permissões atribuídas: ${atribuidas}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao inicializar permissões:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
};

initPermissions();

