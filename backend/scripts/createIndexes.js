const { getDB } = require('../config/db');

const createIndexes = async () => {
    try {
        console.log('🔍 Creating database indexes for performance optimization...');
        
        const db = await getDB();
        console.log('✅ Database connection established');
        
        console.log('🔍 Creating indexes (will skip if already exist)...');

        // Índices para a tabela vuon_resultados
        const indexes = [
            // Índice composto para filtros de bloco (atraso) e data - MAIS IMPORTANTE
            {
                name: 'idx_atraso_data',
                query: `CREATE INDEX idx_atraso_data ON vuon_resultados(atraso, data)`
            },
            // Índice composto para data e agente (otimiza queries com ambos)
            {
                name: 'idx_data_agente',
                query: `CREATE INDEX idx_data_agente ON vuon_resultados(data, agente)`
            },
            // Índice composto para agente e acao (usado frequentemente juntos)
            {
                name: 'idx_agente_acao',
                query: `CREATE INDEX idx_agente_acao ON vuon_resultados(agente, acao)`
            },
            // Índice para agente (usado em muitas queries)
            {
                name: 'idx_agente',
                query: `CREATE INDEX idx_agente ON vuon_resultados(agente)`
            },
            // Índice para acao (usado em filtros de CPC/CPCA)
            {
                name: 'idx_acao',
                query: `CREATE INDEX idx_acao ON vuon_resultados(acao)`
            },
            // Índice para data (usado em GROUP BY)
            {
                name: 'idx_data',
                query: `CREATE INDEX idx_data ON vuon_resultados(data)`
            },
            // Índice para valor (usado em filtros de pagamento)
            {
                name: 'idx_valor',
                query: `CREATE INDEX idx_valor ON vuon_resultados(valor)`
            },
            // Índices compostos adicionais para otimização
            // Índice composto: data + agente + acao (otimiza queries de ALO, CPC, CPCA)
            {
                name: 'idx_data_agente_acao',
                query: `CREATE INDEX idx_data_agente_acao ON vuon_resultados(data, agente, acao)`
            },
            // Índice composto: atraso + data + agente (otimiza queries com filtro de bloco e agente)
            {
                name: 'idx_atraso_data_agente',
                query: `CREATE INDEX idx_atraso_data_agente ON vuon_resultados(atraso, data, agente)`
            },
            // Índice composto: atraso + data + valor (otimiza queries de recebimento)
            {
                name: 'idx_atraso_data_valor',
                query: `CREATE INDEX idx_atraso_data_valor ON vuon_resultados(atraso, data, valor)`
            }
        ];

        let created = 0;
        let skipped = 0;
        let errors = 0;

        for (const index of indexes) {
            try {
                console.log(`⏳ Creating ${index.name}...`);
                await db.execute(index.query);
                console.log(`✅ Index created: ${index.name}`);
                created++;
            } catch (error) {
                // Se o índice já existe ou há outro erro, apenas loga
                if (error.code === 'ER_DUP_KEYNAME' || error.message.includes('Duplicate key name') || error.message.includes('already exists')) {
                    console.log(`ℹ️  Index already exists: ${index.name}`);
                    skipped++;
                } else {
                    console.log(`⚠️  Could not create index ${index.name}: ${error.message}`);
                    errors++;
                }
            }
        }

        console.log(`\n📊 Summary: ${created} created, ${skipped} already existed, ${errors} errors`);

        console.log('✅ Index creation completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating indexes:', error);
        process.exit(1);
    }
};

createIndexes();

