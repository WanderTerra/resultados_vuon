const { getDB } = require('../config/db');

async function optimizeDashboardCards() {
    console.log('🚀 Criando índices para otimizar cards do dashboard...\n');
    
    try {
        const db = await getDB();
        console.log('✅ Database connection established\n');
        
        const indexes = [
            {
                name: 'idx_acao_agente_data_atraso',
                table: 'vuon_resultados',
                columns: '(acao, agente, data, atraso)',
                description: 'Otimiza Diário de Bordo e queries ALO'
            },
            {
                name: 'idx_agente_acao_data',
                table: 'vuon_resultados',
                columns: '(agente, acao, data)',
                description: 'Otimiza Summary ALO e Ações Chart'
            },
            {
                name: 'idx_data_acao_agente',
                table: 'vuon_resultados',
                columns: '(data, acao, agente)',
                description: 'Otimiza queries filtradas por data'
            }
        ];
        
        for (const index of indexes) {
            try {
                console.log(`📊 Criando índice: ${index.name}...`);
                await db.execute(`
                    CREATE INDEX ${index.name} 
                    ON ${index.table} ${index.columns}
                `);
                console.log(`   ✅ Índice ${index.name} criado! (${index.description})\n`);
            } catch (error) {
                if (error.code === 'ER_DUP_KEYNAME') {
                    console.log(`   ⚠️  Índice ${index.name} já existe, pulando...\n`);
                } else {
                    console.log(`   ❌ Erro ao criar índice ${index.name}: ${error.message}\n`);
                }
            }
        }
        
        // Atualizar estatísticas da tabela
        console.log('📊 Atualizando estatísticas da tabela...');
        await db.execute('ANALYZE TABLE vuon_resultados');
        console.log('   ✅ Estatísticas atualizadas!\n');
        
        console.log('✅ Otimização concluída!\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro na otimização:', error);
        process.exit(1);
    }
}

optimizeDashboardCards();

