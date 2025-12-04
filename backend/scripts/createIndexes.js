const { getDB } = require('../config/db');

const createIndexes = async () => {
    try {
        console.log('🔍 Creating database indexes for performance optimization...');
        
        const db = await getDB();
        console.log('✅ Database connection established');
        
        console.log('🔍 Creating indexes (will skip if already exist)...');

        // Índices para a tabela vuon_resultados
        const indexes = [
            // Índice composto para acao + data + agente (otimiza Diário de Bordo e queries de acordos)
            {
                name: 'idx_acao_data_agente',
                query: `CREATE INDEX idx_acao_data_agente ON vuon_resultados(acao, data, agente)`
            },
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
            // Índice para codigo (usado em SPINS)
            {
                name: 'idx_codigo',
                query: `CREATE INDEX idx_codigo ON vuon_resultados(codigo)`
            },
            // Índice para cpf_cnpj (usado em COUNT DISTINCT para acionados únicos)
            {
                name: 'idx_cpf_cnpj',
                query: `CREATE INDEX idx_cpf_cnpj ON vuon_resultados(cpf_cnpj)`
            },
            // Índice composto: data + cpf_cnpj + acao (otimiza COUNT DISTINCT cpf_cnpj com filtros de data e acao)
            {
                name: 'idx_data_cpf_cnpj_acao',
                query: `CREATE INDEX idx_data_cpf_cnpj_acao ON vuon_resultados(data, cpf_cnpj, acao)`
            },
            // Índice composto: atraso + data + cpf_cnpj (otimiza queries de bloco com COUNT DISTINCT cpf_cnpj)
            {
                name: 'idx_atraso_data_cpf_cnpj',
                query: `CREATE INDEX idx_atraso_data_cpf_cnpj ON vuon_resultados(atraso, data, cpf_cnpj)`
            },
            // Índice composto: atraso + data + cpf_cnpj + acao (otimiza queries completas de acionados)
            {
                name: 'idx_atraso_data_cpf_cnpj_acao',
                query: `CREATE INDEX idx_atraso_data_cpf_cnpj_acao ON vuon_resultados(atraso, data, cpf_cnpj, acao)`
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

        // Índices para a tabela vuon_novacoes
        const novacoesIndexes = [
            // Índice composto: atraso_real + data_emissao (filtros de bloco e data)
            {
                name: 'idx_novacoes_atraso_data',
                query: `CREATE INDEX idx_novacoes_atraso_data ON vuon_novacoes(atraso_real, data_emissao)`
            },
            // Índice para data_emissao (usado em GROUP BY)
            {
                name: 'idx_novacoes_data_emissao',
                query: `CREATE INDEX idx_novacoes_data_emissao ON vuon_novacoes(data_emissao)`
            },
            // Índice para cpf_cnpj (usado em COUNT DISTINCT)
            {
                name: 'idx_novacoes_cpf_cnpj',
                query: `CREATE INDEX idx_novacoes_cpf_cnpj ON vuon_novacoes(cpf_cnpj)`
            },
            // Índice composto: tipo + atraso_real (filtro comum)
            {
                name: 'idx_novacoes_tipo_atraso',
                query: `CREATE INDEX idx_novacoes_tipo_atraso ON vuon_novacoes(tipo, atraso_real)`
            }
        ];

        // Índices para a tabela vuon_bordero_pagamento
        const pagamentoIndexes = [
            // Índice composto: atraso_real + data_pagamento (filtros de bloco e data)
            {
                name: 'idx_pagamento_atraso_data',
                query: `CREATE INDEX idx_pagamento_atraso_data ON vuon_bordero_pagamento(atraso_real, data_pagamento)`
            },
            // Índice para data_pagamento (usado em GROUP BY)
            {
                name: 'idx_pagamento_data_pagamento',
                query: `CREATE INDEX idx_pagamento_data_pagamento ON vuon_bordero_pagamento(data_pagamento)`
            },
            // Índice composto: atraso + data_pagamento (fallback quando atraso_real é NULL)
            {
                name: 'idx_pagamento_atraso_fallback',
                query: `CREATE INDEX idx_pagamento_atraso_fallback ON vuon_bordero_pagamento(atraso, data_pagamento)`
            },
            // Índice para valor_recebido (usado em filtros)
            {
                name: 'idx_pagamento_valor_recebido',
                query: `CREATE INDEX idx_pagamento_valor_recebido ON vuon_bordero_pagamento(valor_recebido)`
            }
        ];

        // Combinar todos os índices
        const allIndexes = [...indexes, ...novacoesIndexes, ...pagamentoIndexes];

        let created = 0;
        let skipped = 0;
        let errors = 0;

        for (const index of allIndexes) {
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

