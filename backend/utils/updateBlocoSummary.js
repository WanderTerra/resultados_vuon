const { getDB } = require('../config/db');

/**
 * Atualiza apenas os meses faltantes na tabela materializada bloco_summary
 * Executa em background sem bloquear o servidor
 * 
 * @param {boolean} silent - Se true, reduz a verbosidade dos logs (útil para execuções periódicas)
 */
const updateMissingMonths = async (silent = false) => {
    try {
        const db = await getDB();
        
        if (!silent) {
            console.log('🔄 Verificando e atualizando meses faltantes em bloco_summary...\n');
        }
        
        // Buscar todos os meses disponíveis nos dados
        const [availableMonths] = await db.execute(`
            SELECT DISTINCT 
                YEAR(data) as ano,
                MONTH(data) as mes
            FROM vuon_resultados
            ORDER BY ano DESC, mes DESC
            LIMIT 12
        `);
        
        if (availableMonths.length === 0) {
            if (!silent) {
                console.log('   ⚠️  Nenhum dado encontrado em vuon_resultados\n');
            }
            return;
        }
        
        const blocos = [
            { name: '1', condition: 'atraso >= 61 AND atraso <= 90' },
            { name: '2', condition: 'atraso >= 91 AND atraso <= 180' },
            { name: '3', condition: 'atraso >= 181 AND atraso <= 360' },
            { name: 'wo', condition: 'atraso >= 360 AND atraso <= 9999' }
        ];
        
        let totalUpdated = 0;
        
        for (const bloco of blocos) {
            // Verificar quais meses já existem para este bloco
            const [existingMonths] = await db.execute(`
                SELECT ano, mes 
                FROM bloco_summary 
                WHERE bloco = ?
            `, [bloco.name]);
            
            const existingSet = new Set(
                existingMonths.map(m => `${m.ano}-${String(m.mes).padStart(2, '0')}`)
            );
            
            // Encontrar meses que precisam ser inseridos/atualizados
            const monthsToUpdate = availableMonths.filter(month => {
                const key = `${month.ano}-${String(month.mes).padStart(2, '0')}`;
                return !existingSet.has(key);
            });
            
            if (monthsToUpdate.length === 0) {
                if (!silent) {
                    console.log(`   ✅ Bloco ${bloco.name}: Todos os meses já estão atualizados`);
                }
                continue;
            }
            
            if (!silent) {
                console.log(`   🔨 Bloco ${bloco.name}: Atualizando ${monthsToUpdate.length} mês(es) faltante(s)...`);
            }
            
            for (const month of monthsToUpdate) {
                try {
                    // Deletar registro existente se houver (para garantir atualização)
                    await db.execute(`
                        DELETE FROM bloco_summary 
                        WHERE bloco = ? AND ano = ? AND mes = ?
                    `, [bloco.name, month.ano, month.mes]);
                    
                    // Inserir/atualizar dados
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
                    
                    totalUpdated++;
                    if (!silent) {
                        console.log(`      ✅ ${String(month.mes).padStart(2, '0')}/${month.ano} atualizado`);
                    }
                } catch (error) {
                    console.error(`      ❌ Erro ao atualizar ${month.mes}/${month.ano} do Bloco ${bloco.name}:`, error.message);
                }
            }
        }
        
        if (totalUpdated > 0) {
            if (silent) {
                console.log(`✅ ${totalUpdated} mês(es) atualizado(s) automaticamente em bloco_summary`);
            } else {
                console.log(`\n✅ ${totalUpdated} mês(es) atualizado(s) com sucesso!\n`);
            }
        } else {
            if (!silent) {
                console.log('\n✅ Tabela já está atualizada!\n');
            }
        }
    } catch (error) {
        // Não bloquear inicialização do servidor se houver erro
        console.error('⚠️  Erro ao atualizar bloco_summary:', error.message);
    }
};

module.exports = { updateMissingMonths };

