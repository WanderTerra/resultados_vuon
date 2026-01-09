const { getDB } = require('../config/db');

/**
 * Script para atualizar a tabela materializada bloco_summary
 * Deve ser executado periodicamente (ex: diariamente via cron)
 */
const updateBlocoSummary = async () => {
    try {
        console.log('🔄 Atualizando tabela materializada bloco_summary...\n');
        
        const db = await getDB();
        console.log('✅ Database connection established\n');

        const blocos = [
            { name: '1', condition: 'atraso >= 61 AND atraso <= 90' },
            { name: '2', condition: 'atraso >= 91 AND atraso <= 180' },
            { name: '3', condition: 'atraso >= 181 AND atraso <= 360' },
            { name: 'wo', condition: 'atraso >= 361 AND atraso <= 9999' }
        ];

        // Buscar meses que precisam ser atualizados (últimos 3 meses)
        const today = new Date();
        const monthsToUpdate = [];
        for (let i = 0; i < 3; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            monthsToUpdate.push({
                ano: date.getFullYear(),
                mes: date.getMonth() + 1
            });
        }

        console.log(`📊 Atualizando últimos 3 meses: ${monthsToUpdate.map(m => `${m.mes}/${m.ano}`).join(', ')}\n`);

        for (const bloco of blocos) {
            console.log(`🔨 Processando Bloco ${bloco.name}...`);
            
            for (const month of monthsToUpdate) {
                const start = Date.now();
                
                // Deletar registro existente
                await db.execute(`
                    DELETE FROM bloco_summary 
                    WHERE bloco = ? AND ano = ? AND mes = ?
                `, [bloco.name, month.ano, month.mes]);
                
                // Inserir dados atualizados
                await db.execute(`
                    INSERT INTO bloco_summary (
                        bloco, ano, mes, date_formatted,
                        carteira, acionados, alo, cpc, cpca,
                        acordos_resultados, pgto_resultados, spins, recebimento
                    )
                    SELECT 
                        ? as bloco,
                        ? as ano,
                        ? as mes,
                        CONCAT(LPAD(?, 2, '0'), '/', ?) as date_formatted,
                        COUNT(DISTINCT CASE WHEN cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN cpf_cnpj END) as carteira,
                        COUNT(DISTINCT CASE WHEN acao IS NOT NULL AND acao != '' AND cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN cpf_cnpj END) as acionados,
                        -- Alô: Todas as ocorrências de contato (não CPF único, cliente pode atender várias vezes)
                        COUNT(CASE WHEN agente != '0' AND agente IS NOT NULL AND agente != '' AND cpf_cnpj IS NOT NULL AND cpf_cnpj != '' THEN 1 END) as alo,
                        COALESCE(SUM(CASE 
                            WHEN agente != '0' AND agente IS NOT NULL AND agente != ''
                            AND acao IN ('EIO', 'CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'APC', 'JUR', 'DDA')
                            THEN 1 ELSE 0 END
                        ), 0) as cpc,
                        COALESCE(SUM(CASE 
                            WHEN agente != '0' AND agente IS NOT NULL AND agente != ''
                            AND acao IN ('CSA', 'ACD', 'SCP', 'APH', 'DEF', 'SRP', 'JUR', 'DDA')
                            THEN 1 ELSE 0 END
                        ), 0) as cpca,
                        COALESCE(SUM(CASE 
                            WHEN agente != '0' AND agente IS NOT NULL AND agente != ''
                            AND acao = 'DDA'
                            THEN 1 ELSE 0 END
                        ), 0) as acordos_resultados,
                        COALESCE(SUM(CASE 
                            WHEN agente != '0' AND agente IS NOT NULL AND agente != ''
                            AND valor > 0
                            THEN 1 ELSE 0 END
                        ), 0) as pgto_resultados,
                        COUNT(1) as spins,
                        COALESCE(SUM(CASE WHEN valor > 0 THEN valor ELSE 0 END), 0) as recebimento
                    FROM vuon_resultados
                    WHERE ${bloco.condition}
                        AND YEAR(data) = ?
                        AND MONTH(data) = ?
                `, [
                    bloco.name, 
                    month.ano, 
                    month.mes, 
                    month.mes, 
                    month.ano,
                    month.ano,
                    month.mes
                ]);
                
                const time = ((Date.now() - start) / 1000).toFixed(2);
                console.log(`   ✅ ${month.mes}/${month.ano} atualizado em ${time}s`);
            }
            console.log('');
        }

        console.log('✅ Atualização concluída!\n');
        process.exit(0);

    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
};

updateBlocoSummary();

