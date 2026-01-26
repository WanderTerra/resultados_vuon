const { getDB } = require('../config/db');

/**
 * Função para sincronizar agentes da tabela vuon_resultados para a tabela agentes
 * Extrai número e nome dos agentes únicos e insere apenas os novos
 * @param {boolean} silent - Se true, não exibe logs detalhados (útil para execução automática)
 * @returns {Promise<Object>} Estatísticas da sincronização
 */
const syncAgentesFromResultados = async (silent = false) => {
    try {
        if (!silent) {
            console.log('🔄 Iniciando sincronização da tabela agentes...');
        }

        const db = await getDB();

        // Buscar todos os agentes únicos da tabela vuon_resultados
        if (!silent) {
            console.log('📊 Buscando agentes únicos de vuon_resultados...');
        }
        const [agentesRows] = await db.execute(`
            SELECT DISTINCT agente
            FROM vuon_resultados
            WHERE agente IS NOT NULL
                AND agente != ''
                AND agente != '0'
            ORDER BY agente ASC
        `);

        if (!silent) {
            console.log(`✅ Encontrados ${agentesRows.length} agentes únicos`);
        }

        if (agentesRows.length === 0) {
            if (!silent) {
                console.log('⚠️  Nenhum agente encontrado na tabela vuon_resultados');
            }
            return {
                totalEncontrados: 0,
                novosInseridos: 0,
                jaExistentes: 0,
                erros: 0
            };
        }

        // Processar cada agente para extrair número e nome
        const agentesProcessados = new Map(); // Usar Map para evitar duplicatas por número

        agentesRows.forEach(row => {
            const agente = row.agente.trim();
            
            // Se for apenas número, usar como número do agente
            if (/^\d+$/.test(agente)) {
                const numero = agente;
                if (!agentesProcessados.has(numero)) {
                    agentesProcessados.set(numero, {
                        numero_agente: numero,
                        nome: null
                    });
                }
            }
            // Se tiver formato "número - nome", extrair ambos
            else {
                const match = agente.match(/^(\d+)\s*-\s*(.+)$/);
                if (match) {
                    const numero = match[1].trim();
                    const nome = match[2].trim();
                    
                    // Se já existe um agente com esse número, manter o que tem nome mais completo
                    if (!agentesProcessados.has(numero)) {
                        agentesProcessados.set(numero, {
                            numero_agente: numero,
                            nome: nome
                        });
                    } else {
                        const existente = agentesProcessados.get(numero);
                        // Se o existente não tem nome ou o novo nome é mais completo, atualizar
                        if (!existente.nome || nome.length > existente.nome.length) {
                            agentesProcessados.set(numero, {
                                numero_agente: numero,
                                nome: nome
                            });
                        }
                    }
                }
                // Se não encontrar número no início, tentar extrair qualquer número
                else {
                    const numeroMatch = agente.match(/(\d+)/);
                    if (numeroMatch) {
                        const numero = numeroMatch[1];
                        const nome = agente.replace(numeroMatch[1], '').trim().replace(/^-\s*/, '').trim() || null;
                        
                        if (!agentesProcessados.has(numero)) {
                            agentesProcessados.set(numero, {
                                numero_agente: numero,
                                nome: nome
                            });
                        } else {
                            const existente = agentesProcessados.get(numero);
                            if (!existente.nome || (nome && nome.length > (existente.nome?.length || 0))) {
                                agentesProcessados.set(numero, {
                                    numero_agente: numero,
                                    nome: nome
                                });
                            }
                        }
                    }
                    // Fallback: usar o valor completo como número
                    else {
                        if (!agentesProcessados.has(agente)) {
                            agentesProcessados.set(agente, {
                                numero_agente: agente,
                                nome: null
                            });
                        }
                    }
                }
            }
        });

        const agentesArray = Array.from(agentesProcessados.values());
        if (!silent) {
            console.log(`📝 Processados ${agentesArray.length} agentes únicos (por número)`);
        }

        // Verificar quais agentes já existem na tabela
        if (!silent) {
            console.log('🔍 Verificando agentes já cadastrados...');
        }
        const [agentesExistentes] = await db.execute(`
            SELECT numero_agente FROM agentes
        `);
        const numerosExistentes = new Set(agentesExistentes.map(a => a.numero_agente));
        if (!silent) {
            console.log(`   ${numerosExistentes.size} agentes já cadastrados`);
        }

        // Filtrar apenas os novos agentes
        const novosAgentes = agentesArray.filter(a => !numerosExistentes.has(a.numero_agente));
        if (!silent) {
            console.log(`✨ ${novosAgentes.length} novos agentes para cadastrar`);
        }

        if (novosAgentes.length === 0) {
            if (!silent) {
                console.log('✅ Todos os agentes já estão cadastrados!');
            }
            return {
                totalEncontrados: agentesArray.length,
                novosInseridos: 0,
                jaExistentes: numerosExistentes.size,
                erros: 0
            };
        }

        // Inserir novos agentes
        if (!silent) {
            console.log('💾 Inserindo novos agentes...');
        }
        let inseridos = 0;
        let erros = 0;

        for (const agente of novosAgentes) {
            try {
                await db.execute(
                    `INSERT INTO agentes (numero_agente, nome, fixo_carteira, status) 
                     VALUES (?, ?, ?, ?)`,
                    [agente.numero_agente, agente.nome || null, false, 'ativo']
                );
                inseridos++;
                
                if (!silent && inseridos % 100 === 0) {
                    console.log(`   Progresso: ${inseridos}/${novosAgentes.length} agentes inseridos...`);
                }
            } catch (error) {
                // Ignorar erro de duplicata (pode acontecer em caso de race condition)
                if (error.code !== 'ER_DUP_ENTRY') {
                    if (!silent) {
                        console.error(`   ❌ Erro ao inserir agente ${agente.numero_agente}:`, error.message);
                    }
                    erros++;
                }
            }
        }

        const resultado = {
            totalEncontrados: agentesArray.length,
            novosInseridos: inseridos,
            jaExistentes: numerosExistentes.size,
            erros: erros
        };

        if (!silent) {
            console.log('\n✅ Sincronização concluída!');
            console.log(`   📊 Total de agentes únicos encontrados: ${agentesArray.length}`);
            console.log(`   ✨ Novos agentes inseridos: ${inseridos}`);
            if (erros > 0) {
                console.log(`   ⚠️  Erros: ${erros}`);
            }
            console.log(`   📋 Agentes já existentes: ${numerosExistentes.size}`);

            // Estatísticas finais
            const [totalAgentes] = await db.execute('SELECT COUNT(*) as total FROM agentes WHERE status = "ativo"');
            console.log(`\n📈 Total de agentes ativos na tabela: ${totalAgentes[0].total}`);
        } else if (inseridos > 0) {
            // Em modo silencioso, só loga se houver novos agentes
            console.log(`🔄 Sincronização de agentes: ${inseridos} novo(s) agente(s) inserido(s)`);
        }

        return resultado;
    } catch (error) {
        console.error('❌ Erro ao sincronizar tabela agentes:', error);
        if (!silent) {
            console.error('Stack:', error.stack);
        }
        throw error;
    }
};

// Se executado diretamente (não importado), executar a função
if (require.main === module) {
    syncAgentesFromResultados(false)
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Erro fatal:', error);
            process.exit(1);
        });
}

// Exportar a função para uso em outros módulos
module.exports = { syncAgentesFromResultados };

