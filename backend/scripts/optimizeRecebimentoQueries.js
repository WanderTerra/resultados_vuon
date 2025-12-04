const { getDB } = require('../config/db');

async function optimizeRecebimentoQueries() {
    console.log('🚀 Criando índices para otimizar recebimento diário e filtros...\n');
    
    try {
        const db = await getDB();
        console.log('✅ Database connection established\n');
        
        // Verificar estrutura da tabela
        console.log('📊 Verificando estrutura da tabela vuon_bordero_pagamento...');
        const [columns] = await db.execute(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'vuon_bordero_pagamento'
            AND COLUMN_NAME IN ('data_pagamento', 'atraso', 'atraso_real', 'valor_recebido')
            ORDER BY COLUMN_NAME
        `);
        
        console.log('   Colunas relevantes encontradas:');
        columns.forEach(col => {
            console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
        });
        console.log('');
        
        // Índices para otimizar recebimento diário e filtros
        const indexes = [
            {
                name: 'idx_data_pagamento_atraso_valor',
                table: 'vuon_bordero_pagamento',
                columns: '(data_pagamento, atraso, valor_recebido)',
                description: 'Otimiza recebimento diário e filtros por data'
            },
            {
                name: 'idx_data_pagamento_atraso_real_valor',
                table: 'vuon_bordero_pagamento',
                columns: '(data_pagamento, atraso_real, valor_recebido)',
                description: 'Otimiza recebimento diário com atraso_real'
            },
            {
                name: 'idx_atraso_data_pagamento',
                table: 'vuon_bordero_pagamento',
                columns: '(atraso, data_pagamento)',
                description: 'Otimiza filtros por bloco e data'
            },
            {
                name: 'idx_atraso_real_data_pagamento',
                table: 'vuon_bordero_pagamento',
                columns: '(atraso_real, data_pagamento)',
                description: 'Otimiza filtros por bloco (atraso_real) e data'
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
        await db.execute('ANALYZE TABLE vuon_bordero_pagamento');
        console.log('   ✅ Estatísticas atualizadas!\n');
        
        console.log('✅ Otimização concluída!\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro na otimização:', error);
        process.exit(1);
    }
}

optimizeRecebimentoQueries();

