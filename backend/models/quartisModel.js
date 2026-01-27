const { getDB } = require('../config/db');
const AgentesModel = require('./agentesModel');

class QuartisModel {
    /**
     * Busca dados de DDA por agente e separa em quartis
     * @param {string} startDate - Data inicial (opcional)
     * @param {string} endDate - Data final (opcional)
     * @param {boolean} apenasFixos - Se true, busca apenas agentes fixos. Se false, busca todos os agentes
     * @returns {Promise<Object>} Dados dos quartis
     */
    static async getQuartis(startDate = null, endDate = null, apenasFixos = false) {
        const db = await getDB();
        
        let dateFilter = '';
        const params = [];
        
        if (startDate && endDate) {
            dateFilter = 'AND DATE(data) >= ? AND DATE(data) <= ?';
            params.push(startDate, endDate);
        }
        
        let query = '';
        let queryParams = [];
        
        if (apenasFixos) {
            // Buscar números dos agentes fixos da carteira
            const agentesFixos = await AgentesModel.getNumerosFixos();
            
            console.log(`📊 Quartis - Agentes fixos encontrados: ${agentesFixos.length}`);
            if (agentesFixos.length > 0) {
                console.log(`   Primeiros 5: ${agentesFixos.slice(0, 5).join(', ')}`);
            }
            
            if (agentesFixos.length === 0) {
                // Se não houver agentes fixos cadastrados e o usuário quer apenas fixos, retornar vazio
                console.log('⚠️  Nenhum agente fixo cadastrado. Retornando quartis vazios.');
                return {
                    quartil1: [],
                    quartil2: [],
                    quartil3: [],
                    quartil4: [],
                    totalAgentes: 0,
                    estatisticas: {
                        quartil1: { min: 0, max: 0, media: 0, total: 0 },
                        quartil2: { min: 0, max: 0, media: 0, total: 0 },
                        quartil3: { min: 0, max: 0, media: 0, total: 0 },
                        quartil4: { min: 0, max: 0, media: 0, total: 0 }
                    },
                    aviso: 'Nenhum agente fixo cadastrado. Cadastre agentes fixos na página "Cadastrar Agentes".'
                };
            }
            
            // Criar placeholders para o IN clause
            const placeholders = agentesFixos.map(() => '?').join(',');
            
            // Buscar todos os agentes FIXOS com a quantidade de DDA no período
            query = `
                SELECT 
                    agente,
                    COUNT(*) as total_dda,
                    COALESCE(SUM(valor), 0) as valor_total
                FROM vuon_resultados
                WHERE acao = 'DDA'
                    AND agente != '0'
                    AND agente IS NOT NULL
                    AND agente != ''
                    AND agente IN (${placeholders})
                    ${dateFilter}
                GROUP BY agente
                ORDER BY total_dda DESC
            `;
            
            // Combinar parâmetros: primeiro os números dos agentes, depois as datas (se houver)
            queryParams = [...agentesFixos, ...params];
        } else {
            // Buscar TODOS os agentes (não apenas fixos)
            console.log('📊 Quartis - Buscando TODOS os agentes (não apenas fixos)');
            query = `
                SELECT 
                    agente,
                    COUNT(*) as total_dda,
                    COALESCE(SUM(valor), 0) as valor_total
                FROM vuon_resultados
                WHERE acao = 'DDA'
                    AND agente != '0'
                    AND agente IS NOT NULL
                    AND agente != ''
                    ${dateFilter}
                GROUP BY agente
                ORDER BY total_dda DESC
            `;
            queryParams = params;
        }
        
        console.log(`📊 Quartis - Executando query com ${queryParams.length} parâmetros`);
        if (dateFilter) {
            console.log(`   Filtro de data: ${startDate} até ${endDate}`);
        }
        
        const [rows] = await db.execute(query, queryParams);
        
        console.log(`📊 Quartis - Agentes encontrados com DDA: ${rows.length}`);
        if (rows.length > 0) {
            console.log(`   Primeiros 5 agentes: ${rows.slice(0, 5).map(r => `${r.agente} (${r.total_dda} DDA)`).join(', ')}`);
        } else {
            console.log('⚠️  Nenhum agente encontrado com DDA no período selecionado.');
            if (apenasFixos) {
                console.log('   Dica: Cadastre agentes fixos na página "Cadastrar Agentes"');
            }
        }
        
        if (rows.length === 0) {
            return {
                quartil1: [],
                quartil2: [],
                quartil3: [],
                quartil4: [],
                totalAgentes: 0,
                estatisticas: {
                    quartil1: { min: 0, max: 0, media: 0, total: 0 },
                    quartil2: { min: 0, max: 0, media: 0, total: 0 },
                    quartil3: { min: 0, max: 0, media: 0, total: 0 },
                    quartil4: { min: 0, max: 0, media: 0, total: 0 }
                },
                aviso: apenasFixos 
                    ? 'Nenhum dado de DDA encontrado no período selecionado para agentes fixos.' 
                    : 'Nenhum dado de DDA encontrado no período selecionado.'
            };
        }
        
        // IMPORTANTE: Os agentes já estão ordenados por total_dda DESC (maior para menor)
        // O 1º quartil sempre terá os MELHORES agentes (maior quantidade de DDA)
        // O 4º quartil sempre terá os PIORES agentes (menor quantidade de DDA)
        
        // Agora vamos dividir com base na QUANTIDADE TOTAL DE DDA,
        // escolhendo o ponto de corte que deixa cada quartil o mais
        // próximo possível de 25%, 50% e 75% do total.
        const totalAgentes = rows.length;
        
        // Quantidade total de DDA (somando todos os agentes)
        const quantidadeTotalGeral = rows.reduce((sum, agente) => {
            return sum + (parseInt(agente.total_dda) || 0);
        }, 0);
        
        // Declarar variáveis dos quartis no escopo externo
        let quartil1, quartil2, quartil3, quartil4;
        
        if (totalAgentes <= 4 || quantidadeTotalGeral === 0) {
            // Caso extremo: poucos agentes ou sem DDA – cai para divisão simples por posição
            const tamanhoQuartil = Math.floor(totalAgentes / 4);
            const resto = totalAgentes % 4;
            const tamanhoQuartil1 = tamanhoQuartil + (resto >= 1 ? 1 : 0);
            const tamanhoQuartil2 = tamanhoQuartil + (resto >= 2 ? 1 : 0);
            const tamanhoQuartil3 = tamanhoQuartil + (resto >= 3 ? 1 : 0);
            const tamanhoQuartil4 = tamanhoQuartil;
            
            quartil1 = rows.slice(0, tamanhoQuartil1);
            quartil2 = rows.slice(tamanhoQuartil1, tamanhoQuartil1 + tamanhoQuartil2);
            quartil3 = rows.slice(tamanhoQuartil1 + tamanhoQuartil2, tamanhoQuartil1 + tamanhoQuartil2 + tamanhoQuartil3);
            quartil4 = rows.slice(tamanhoQuartil1 + tamanhoQuartil2 + tamanhoQuartil3);
            
            console.log(`📊 Quartis - Caso extremo (<=4 agentes ou sem DDA), divisão por posição.`);
        } else {
            // Alvos de DDA para os cortes (25%, 50%, 75%)
            const targets = [
                quantidadeTotalGeral * 0.25,
                quantidadeTotalGeral * 0.50,
                quantidadeTotalGeral * 0.75
            ];
            
            const limites = []; // índices finais de cada quartil (0‑based)
            let acumulado = 0;
            
            // Para cada alvo (25%, 50%, 75%), encontrar o índice que deixa o acumulado mais próximo
            for (let targetIdx = 0; targetIdx < targets.length; targetIdx++) {
                const alvo = targets[targetIdx];
                let melhorIndice = -1;
                let melhorDiff = Infinity;
                let acumuladoLocal = acumulado;
                
                // Continuar de onde paramos (após o último limite encontrado)
                const startIndex = limites.length > 0 ? limites[limites.length - 1] + 1 : 0;
                
                for (let i = startIndex; i < rows.length; i++) {
                    const qtd = parseInt(rows[i].total_dda) || 0;
                    acumuladoLocal += qtd;
                    
                    const diff = Math.abs(acumuladoLocal - alvo);
                    
                    // Se encontrou um ponto mais próximo, atualiza
                    if (diff < melhorDiff) {
                        melhorDiff = diff;
                        melhorIndice = i;
                    }
                    
                    // Se já passou muito do alvo e a diferença está aumentando, para
                    // (isso garante que pegamos o ponto mais próximo, não continuamos indefinidamente)
                    if (acumuladoLocal > alvo && diff > melhorDiff) {
                        break;
                    }
                }
                
                // Se encontrou um índice válido, adiciona aos limites e atualiza acumulado
                if (melhorIndice >= 0) {
                    limites.push(melhorIndice);
                    // Atualizar acumulado para o próximo alvo
                    for (let i = startIndex; i <= melhorIndice; i++) {
                        acumulado += parseInt(rows[i].total_dda) || 0;
                    }
                } else {
                    // Fallback: se não encontrou, usar o último índice disponível
                    limites.push(rows.length - 1);
                }
            }
            
            // Garantir que temos 3 limites (para 4 quartis)
            while (limites.length < 3) {
                limites.push(rows.length - 1);
            }
            
            // Garantir que os limites estão em ordem crescente e não ultrapassam o total
            const idxQ1 = Math.min(limites[0], rows.length - 1);
            const idxQ2 = Math.min(Math.max(limites[1], idxQ1 + 1), rows.length - 1);
            const idxQ3 = Math.min(Math.max(limites[2], idxQ2 + 1), rows.length - 1);
            
            quartil1 = rows.slice(0, idxQ1 + 1);
            quartil2 = rows.slice(idxQ1 + 1, idxQ2 + 1);
            quartil3 = rows.slice(idxQ2 + 1, idxQ3 + 1);
            quartil4 = rows.slice(idxQ3 + 1);
            
            // Recalcular DDA acumulado por quartil para log
            const somaQuartil = (lista) =>
                lista.reduce((s, a) => s + (parseInt(a.total_dda) || 0), 0);
            
            const ddaQ1 = somaQuartil(quartil1);
            const ddaQ2 = somaQuartil(quartil2);
            const ddaQ3 = somaQuartil(quartil3);
            const ddaQ4 = somaQuartil(quartil4);
            
            console.log(`📊 Quartis - Distribuição por QUANTIDADE de DDA (otimizada):`);
            console.log(`   Total de agentes: ${totalAgentes}`);
            console.log(`   Total DDA geral: ${quantidadeTotalGeral}`);
            console.log(`   1º Quartil: ${quartil1.length} agentes, DDA: ${ddaQ1} (${((ddaQ1 / quantidadeTotalGeral) * 100).toFixed(2)}%)`);
            console.log(`   2º Quartil: ${quartil2.length} agentes, DDA: ${ddaQ2} (${((ddaQ2 / quantidadeTotalGeral) * 100).toFixed(2)}%)`);
            console.log(`   3º Quartil: ${quartil3.length} agentes, DDA: ${ddaQ3} (${((ddaQ3 / quantidadeTotalGeral) * 100).toFixed(2)}%)`);
            console.log(`   4º Quartil: ${quartil4.length} agentes, DDA: ${ddaQ4} (${((ddaQ4 / quantidadeTotalGeral) * 100).toFixed(2)}%)`);
        }
        
        // Verificação de segurança: garantir que todas as variáveis estão definidas
        if (typeof quartil1 === 'undefined' || typeof quartil2 === 'undefined' || typeof quartil3 === 'undefined' || typeof quartil4 === 'undefined') {
            console.error('❌ Erro: Algum quartil não foi definido!');
            console.error(`   quartil1: ${typeof quartil1}, quartil2: ${typeof quartil2}, quartil3: ${typeof quartil3}, quartil4: ${typeof quartil4}`);
            console.error(`   totalAgentes: ${totalAgentes}, quantidadeTotalGeral: ${quantidadeTotalGeral}`);
            // Fallback: inicializar com arrays vazios
            if (typeof quartil1 === 'undefined') quartil1 = [];
            if (typeof quartil2 === 'undefined') quartil2 = [];
            if (typeof quartil3 === 'undefined') quartil3 = [];
            if (typeof quartil4 === 'undefined') quartil4 = [];
        }
        
        console.log(`✅ Quartis definidos - Q1: ${quartil1?.length || 0}, Q2: ${quartil2?.length || 0}, Q3: ${quartil3?.length || 0}, Q4: ${quartil4?.length || 0}`);
        
        // Calcular estatísticas para cada quartil (baseado na quantidade de DDA)
        const calcularEstatisticas = (quartil) => {
            if (quartil.length === 0) {
                return { min: 0, max: 0, media: 0, total: 0 };
            }
            const quantidades = quartil.map(a => parseInt(a.total_dda) || 0);
            const min = Math.min(...quantidades);
            const max = Math.max(...quantidades);
            const total = quantidades.reduce((a, b) => a + b, 0);
            const media = total / quantidades.length;
            return { 
                min: Math.round(min), 
                max: Math.round(max), 
                media: Math.round(media * 100) / 100,
                total: Math.round(total)
            };
        };
        
        return {
            quartil1,
            quartil2,
            quartil3,
            quartil4,
            totalAgentes,
            estatisticas: {
                quartil1: calcularEstatisticas(quartil1),
                quartil2: calcularEstatisticas(quartil2),
                quartil3: calcularEstatisticas(quartil3),
                quartil4: calcularEstatisticas(quartil4)
            }
        };
    }
}

module.exports = QuartisModel;

