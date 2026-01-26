const { getDB } = require('../config/db');

/**
 * Script para criar índices otimizados para as queries dos blocos
 * Foca em melhorar a performance de COUNT(DISTINCT cpf_cnpj) com filtros de atraso e data
 */
const optimizeBlocoQueries = async () => {
    try {
        console.log('🚀 Otimizando índices para queries dos blocos...\n');
        
        const db = await getDB();
        console.log('✅ Database connection established\n');

        // 1. Verificar índices existentes
        console.log('📊 1. Verificando índices existentes...\n');
        const [existingIndexes] = await db.execute(`
            SELECT 
                INDEX_NAME,
                COLUMN_NAME,
                SEQ_IN_INDEX,
                NON_UNIQUE
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'vuon_resultados'
            ORDER BY INDEX_NAME, SEQ_IN_INDEX
        `);

        console.log(`   Encontrados ${existingIndexes.length} índices:\n`);
        const indexMap = new Map();
        existingIndexes.forEach(idx => {
            if (!indexMap.has(idx.INDEX_NAME)) {
                indexMap.set(idx.INDEX_NAME, []);
            }
            indexMap.get(idx.INDEX_NAME).push(idx.COLUMN_NAME);
        });

        indexMap.forEach((columns, name) => {
            console.log(`   - ${name}: (${columns.join(', ')})`);
        });
        console.log('');

        // 2. Índices recomendados para otimizar COUNT(DISTINCT cpf_cnpj)
        console.log('📊 2. Criando índices otimizados...\n');

        const indexesToCreate = [
            {
                name: 'idx_atraso_data_cpf_cnpj_acao',
                query: `CREATE INDEX idx_atraso_data_cpf_cnpj_acao ON vuon_resultados(atraso, data, cpf_cnpj, acao)`,
                reason: 'Otimiza COUNT(DISTINCT cpf_cnpj) com filtros de atraso e data, e filtros de acao'
            },
            {
                name: 'idx_atraso_data_cpf_cnpj_agente',
                query: `CREATE INDEX idx_atraso_data_cpf_cnpj_agente ON vuon_resultados(atraso, data, cpf_cnpj, agente)`,
                reason: 'Otimiza COUNT(DISTINCT cpf_cnpj) com filtros de atraso, data e agente'
            },
            {
                name: 'idx_data_atraso_cpf_cnpj',
                query: `CREATE INDEX idx_data_atraso_cpf_cnpj ON vuon_resultados(data, atraso, cpf_cnpj)`,
                reason: 'Otimiza queries com filtro de data primeiro (útil para range de datas)'
            },
            {
                name: 'idx_cpf_cnpj_data_atraso',
                query: `CREATE INDEX idx_cpf_cnpj_data_atraso ON vuon_resultados(cpf_cnpj, data, atraso)`,
                reason: 'Otimiza COUNT(DISTINCT) quando cpf_cnpj é a coluna principal'
            }
        ];

        for (const idx of indexesToCreate) {
            try {
                // Verificar se o índice já existe
                const exists = existingIndexes.some(i => i.INDEX_NAME === idx.name);
                
                if (exists) {
                    console.log(`   ⚠️  Índice ${idx.name} já existe. Pulando...`);
                } else {
                    console.log(`   🔨 Criando índice: ${idx.name}`);
                    console.log(`      Motivo: ${idx.reason}`);
                    await db.execute(idx.query);
                    console.log(`      ✅ Índice criado com sucesso!\n`);
                }
            } catch (error) {
                if (error.code === 'ER_DUP_KEYNAME') {
                    console.log(`   ⚠️  Índice ${idx.name} já existe. Pulando...\n`);
                } else {
                    console.error(`   ❌ Erro ao criar índice ${idx.name}: ${error.message}\n`);
                }
            }
        }

        // 3. Analisar estatísticas da tabela
        console.log('📊 3. Analisando estatísticas da tabela...\n');
        const [tableStats] = await db.execute(`
            SELECT 
                table_rows,
                ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb,
                ROUND((data_length / 1024 / 1024), 2) AS data_mb,
                ROUND((index_length / 1024 / 1024), 2) AS index_mb
            FROM information_schema.TABLES
            WHERE table_schema = DATABASE()
            AND table_name = 'vuon_resultados'
        `);

        if (tableStats.length > 0) {
            const stats = tableStats[0];
            console.log(`   Registros: ${stats.table_rows.toLocaleString()}`);
            console.log(`   Tamanho total: ${stats.size_mb} MB`);
            console.log(`   Dados: ${stats.data_mb} MB`);
            console.log(`   Índices: ${stats.index_mb} MB\n`);
        }

        // 4. Sugestões de otimização
        console.log('💡 4. Sugestões de otimização:\n');
        console.log('   1. Os índices compostos criados devem melhorar significativamente a performance');
        console.log('   2. Para queries com filtros de data, o índice idx_data_atraso_cpf_cnpj será usado');
        console.log('   3. Para COUNT(DISTINCT), o índice idx_cpf_cnpj_data_atraso será útil');
        console.log('   4. Considere aumentar o TTL do cache para reduzir queries ao banco');
        console.log('   5. Para melhor performance, execute ANALYZE TABLE após criar os índices:\n');
        console.log('      ANALYZE TABLE vuon_resultados;\n');

        // 5. Executar ANALYZE TABLE
        console.log('📊 5. Executando ANALYZE TABLE para atualizar estatísticas...\n');
        try {
            await db.execute('ANALYZE TABLE vuon_resultados');
            console.log('   ✅ ANALYZE TABLE executado com sucesso!\n');
        } catch (error) {
            console.log(`   ⚠️  Erro ao executar ANALYZE TABLE: ${error.message}\n`);
        }

        console.log('✅ Otimização concluída!\n');
        process.exit(0);

    } catch (error) {
        console.error('❌ Erro durante a otimização:', error);
        process.exit(1);
    }
};

optimizeBlocoQueries();



