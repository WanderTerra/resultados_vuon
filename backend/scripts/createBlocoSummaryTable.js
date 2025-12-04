const { getDB } = require('../config/db');

/**
 * Script para criar tabela materializada com dados agregados dos blocos
 * Isso permite queries muito mais rápidas (segundos em vez de minutos)
 */
const createBlocoSummaryTable = async () => {
    try {
        console.log('🚀 Criando tabela materializada para otimização...\n');
        
        const db = await getDB();
        console.log('✅ Database connection established\n');

        // 1. Criar tabela de resumo
        console.log('📊 1. Criando tabela bloco_summary...\n');
        
        await db.execute(`
            CREATE TABLE IF NOT EXISTS bloco_summary (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                bloco VARCHAR(10) NOT NULL,
                ano INT NOT NULL,
                mes INT NOT NULL,
                date_formatted VARCHAR(10) NOT NULL,
                carteira INT NOT NULL DEFAULT 0,
                acionados INT NOT NULL DEFAULT 0,
                alo INT NOT NULL DEFAULT 0,
                cpc INT NOT NULL DEFAULT 0,
                cpca INT NOT NULL DEFAULT 0,
                acordos_resultados INT NOT NULL DEFAULT 0,
                pgto_resultados INT NOT NULL DEFAULT 0,
                spins INT NOT NULL DEFAULT 0,
                recebimento DECIMAL(15,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_bloco_month (bloco, ano, mes),
                INDEX idx_bloco_date (bloco, ano, mes),
                INDEX idx_date_formatted (date_formatted)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        console.log('   ✅ Tabela bloco_summary criada!\n');

        // 2. Popular a tabela com dados agregados
        console.log('📊 2. Populando tabela com dados agregados...\n');
        console.log('   ⚠️  Isso pode levar alguns minutos...\n');

        const blocos = [
            { name: '1', condition: 'atraso >= 61 AND atraso <= 90' },
            { name: '2', condition: 'atraso >= 91 AND atraso <= 180' },
            { name: '3', condition: 'atraso >= 181 AND atraso <= 360' },
            { name: 'wo', condition: 'atraso >= 360 AND atraso <= 9999' }
        ];

        for (const bloco of blocos) {
            console.log(`   🔨 Processando Bloco ${bloco.name}...`);
            const start = Date.now();
            
            // Limpar dados antigos deste bloco
            await db.execute(`DELETE FROM bloco_summary WHERE bloco = ?`, [bloco.name]);
            
            // Inserir dados agregados
            await db.execute(`
                INSERT INTO bloco_summary (
                    bloco, ano, mes, date_formatted,
                    carteira, acionados, alo, cpc, cpca,
                    acordos_resultados, pgto_resultados, spins, recebimento
                )
                SELECT 
                    ? as bloco,
                    YEAR(data) as ano,
                    MONTH(data) as mes,
                    CONCAT(LPAD(MONTH(data), 2, '0'), '/', YEAR(data)) as date_formatted,
                    COUNT(DISTINCT CASE WHEN cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN cpf_cnpj END) as carteira,
                    COUNT(DISTINCT CASE WHEN acao IS NOT NULL AND acao != '' AND cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN cpf_cnpj END) as acionados,
                    COUNT(DISTINCT CASE WHEN agente != '0' AND agente IS NOT NULL AND agente != '' AND cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN cpf_cnpj END) as alo,
                    SUM(CASE 
                        WHEN agente != '0' AND agente IS NOT NULL AND agente != ''
                        AND acao IN ('EIO', 'CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'APC', 'JUR', 'DDA')
                        THEN 1 ELSE 0 END
                    ) as cpc,
                    SUM(CASE 
                        WHEN agente != '0' AND agente IS NOT NULL AND agente != ''
                        AND acao IN ('CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'JUR', 'DDA')
                        THEN 1 ELSE 0 END
                    ) as cpca,
                    SUM(CASE 
                        WHEN agente != '0' AND agente IS NOT NULL AND agente != ''
                        AND acao = 'DDA'
                        THEN 1 ELSE 0 END
                    ) as acordos_resultados,
                    SUM(CASE 
                        WHEN agente != '0' AND agente IS NOT NULL AND agente != ''
                        AND valor > 0
                        THEN 1 ELSE 0 END
                    ) as pgto_resultados,
                    COUNT(DISTINCT codigo) as spins,
                    COALESCE(SUM(CASE WHEN valor > 0 THEN valor ELSE 0 END), 0) as recebimento
                FROM vuon_resultados
                WHERE ${bloco.condition}
                GROUP BY YEAR(data), MONTH(data)
            `, [bloco.name]);
            
            const time = ((Date.now() - start) / 1000).toFixed(2);
            const [count] = await db.execute(`SELECT COUNT(*) as total FROM bloco_summary WHERE bloco = ?`, [bloco.name]);
            console.log(`      ✅ Concluído! ${count[0].total} meses processados em ${time}s\n`);
        }

        // 3. Criar índices adicionais
        console.log('📊 3. Criando índices adicionais...\n');
        
        try {
            await db.execute(`CREATE INDEX idx_bloco_summary_date_range ON bloco_summary(bloco, ano, mes)`);
            console.log('   ✅ Índices criados!\n');
        } catch (error) {
            if (error.code !== 'ER_DUP_KEYNAME') {
                console.log(`   ⚠️  ${error.message}\n`);
            }
        }

        // 4. Estatísticas
        console.log('📊 4. Estatísticas da tabela...\n');
        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total_registros,
                COUNT(DISTINCT bloco) as total_blocos,
                MIN(CONCAT(ano, '-', LPAD(mes, 2, '0'))) as primeiro_mes,
                MAX(CONCAT(ano, '-', LPAD(mes, 2, '0'))) as ultimo_mes
            FROM bloco_summary
        `);
        
        if (stats.length > 0) {
            console.log(`   Total de registros: ${stats[0].total_registros.toLocaleString()}`);
            console.log(`   Blocos: ${stats[0].total_blocos}`);
            console.log(`   Período: ${stats[0].primeiro_mes} até ${stats[0].ultimo_mes}\n`);
        }

        console.log('✅ Tabela materializada criada e populada com sucesso!\n');
        console.log('💡 Agora as queries devem ser MUITO mais rápidas (milissegundos em vez de minutos)\n');
        console.log('⚠️  IMPORTANTE: Esta tabela precisa ser atualizada periodicamente quando novos dados são inseridos\n');
        console.log('   Use: npm run update-bloco-summary\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
};

createBlocoSummaryTable();

