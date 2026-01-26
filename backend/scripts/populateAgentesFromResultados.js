const { getDB } = require('../config/db');

/**
 * Função para sincronizar agentes da tabela vuon_resultados para a tabela agentes
 * Extrai número e nome APENAS da coluna 'agente' (não usa a coluna 'nome' que é do cliente)
 * Formato esperado na coluna agente: "número" ou "número - nome do agente"
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
                nomesAtualizados: 0,
                erros: 0
            };
        }

        // Buscar nomes dos agentes da tabela recebimentos_por_cobrador (fonte mais confiável)
        if (!silent) {
            console.log('📊 Buscando nomes de agentes de recebimentos_por_cobrador...');
        }
        const [agentesCobrador] = await db.execute(`
            SELECT DISTINCT agente_id, agente_nome
            FROM recebimentos_por_cobrador
            WHERE agente_id IS NOT NULL
                AND agente_id != 0
                AND agente_nome IS NOT NULL
                AND agente_nome != ''
        `);
        
        // Criar mapa de agente_id -> agente_nome
        const nomesAgentesMap = new Map();
        agentesCobrador.forEach(row => {
            const agenteId = String(row.agente_id).trim();
            const agenteNome = row.agente_nome.trim();
            // Se já existe, manter o mais longo (mais completo)
            if (!nomesAgentesMap.has(agenteId) || agenteNome.length > (nomesAgentesMap.get(agenteId)?.length || 0)) {
                nomesAgentesMap.set(agenteId, agenteNome);
            }
        });
        
        if (!silent) {
            console.log(`   Encontrados ${nomesAgentesMap.size} agentes com nome em recebimentos_por_cobrador`);
        }

        // Processar cada agente para extrair número e nome
        const agentesProcessados = new Map(); // Usar Map para evitar duplicatas por número

        agentesRows.forEach(row => {
            const agente = row.agente.trim();
            let numero = null;
            let nome = null;
            
            // Se for apenas número, usar como número do agente
            if (/^\d+$/.test(agente)) {
                numero = agente;
                // Tentar buscar nome da tabela recebimentos_por_cobrador
                nome = nomesAgentesMap.get(numero) || null;
            }
            // Se tiver formato "número - nome", extrair ambos
            else {
                const match = agente.match(/^(\d+)\s*-\s*(.+)$/);
                if (match) {
                    numero = match[1].trim();
                    const nomeDoAgente = match[2].trim();
                    // Priorizar nome da tabela recebimentos_por_cobrador, senão usar o extraído
                    nome = nomesAgentesMap.get(numero) || nomeDoAgente;
                }
                // Se não encontrar número no início, tentar extrair qualquer número
                else {
                    const numeroMatch = agente.match(/(\d+)/);
                    if (numeroMatch) {
                        numero = numeroMatch[1];
                        const nomeExtraido = agente.replace(numeroMatch[1], '').trim().replace(/^-\s*/, '').trim() || null;
                        // Priorizar nome da tabela recebimentos_por_cobrador, senão usar o extraído
                        nome = nomesAgentesMap.get(numero) || nomeExtraido;
                    }
                    // Fallback: usar o valor completo como número
                    else {
                        numero = agente;
                        nome = null;
                    }
                }
            }
            
            // Adicionar ao mapa (se já existe, manter o nome mais completo)
            if (numero) {
                if (!agentesProcessados.has(numero)) {
                    agentesProcessados.set(numero, {
                        numero_agente: numero,
                        nome: nome
                    });
                } else {
                    const existente = agentesProcessados.get(numero);
                    // Atualizar nome se o novo for mais completo ou se o existente não tem nome
                    if (!existente.nome || (nome && nome.length > (existente.nome?.length || 0))) {
                        agentesProcessados.set(numero, {
                            numero_agente: numero,
                            nome: nome
                        });
                    }
                }
            }
        });

        const agentesArray = Array.from(agentesProcessados.values());
        if (!silent) {
            console.log(`📝 Processados ${agentesArray.length} agentes únicos (por número)`);
        }

        // Verificar quais agentes já existem na tabela e atualizar nomes se necessário
        if (!silent) {
            console.log('🔍 Verificando agentes já cadastrados...');
        }
        const [agentesExistentes] = await db.execute(`
            SELECT id, numero_agente, nome FROM agentes
        `);
        const numerosExistentes = new Set(agentesExistentes.map(a => a.numero_agente));
        const agentesExistentesMap = new Map(agentesExistentes.map(a => [a.numero_agente, a]));
        
        if (!silent) {
            console.log(`   ${numerosExistentes.size} agentes já cadastrados`);
        }

        // Atualizar nomes dos agentes existentes usando recebimentos_por_cobrador
        if (!silent && nomesAgentesMap.size > 0) {
            console.log('🔄 Atualizando nomes de agentes existentes...');
        }
        let nomesAtualizados = 0;
        for (const [agenteId, agenteNome] of nomesAgentesMap.entries()) {
            if (agentesExistentesMap.has(agenteId)) {
                const agenteExistente = agentesExistentesMap.get(agenteId);
                // Atualizar apenas se o agente não tem nome ou se o nome da tabela recebimentos é mais completo
                if (!agenteExistente.nome || (agenteNome && agenteNome.length > (agenteExistente.nome?.length || 0))) {
                    try {
                        await db.execute(
                            `UPDATE agentes SET nome = ? WHERE id = ?`,
                            [agenteNome, agenteExistente.id]
                        );
                        nomesAtualizados++;
                    } catch (error) {
                        if (!silent) {
                            console.error(`   ⚠️  Erro ao atualizar nome do agente ${agenteId}:`, error.message);
                        }
                    }
                }
            }
        }
        if (!silent && nomesAtualizados > 0) {
            console.log(`   ✅ ${nomesAtualizados} nomes de agentes atualizados`);
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
                nomesAtualizados: nomesAtualizados,
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
            nomesAtualizados: nomesAtualizados,
            erros: erros
        };

        if (!silent) {
            console.log('\n✅ Sincronização concluída!');
            console.log(`   📊 Total de agentes únicos encontrados: ${agentesArray.length}`);
            console.log(`   ✨ Novos agentes inseridos: ${inseridos}`);
            if (nomesAtualizados > 0) {
                console.log(`   📝 Nomes de agentes atualizados: ${nomesAtualizados}`);
            }
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

