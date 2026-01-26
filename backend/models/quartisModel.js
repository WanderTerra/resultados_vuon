const { getDB } = require('../config/db');
const AgentesModel = require('./agentesModel');

class QuartisModel {
    /**
     * Busca dados de DDA por agente e separa em quartis
     * @param {string} startDate - Data inicial (opcional)
     * @param {string} endDate - Data final (opcional)
     * @returns {Promise<Object>} Dados dos quartis
     */
    static async getQuartis(startDate = null, endDate = null) {
        const db = await getDB();
        
        let dateFilter = '';
        const params = [];
        
        if (startDate && endDate) {
            dateFilter = 'AND DATE(data) >= ? AND DATE(data) <= ?';
            params.push(startDate, endDate);
        }
        
        // Buscar números dos agentes fixos da carteira
        const agentesFixos = await AgentesModel.getNumerosFixos();
        
        console.log(`📊 Quartis - Agentes fixos encontrados: ${agentesFixos.length}`);
        if (agentesFixos.length > 0) {
            console.log(`   Primeiros 5: ${agentesFixos.slice(0, 5).join(', ')}`);
        }
        
        let query = '';
        let queryParams = [];
        
        if (agentesFixos.length === 0) {
            // Se não houver agentes fixos cadastrados, buscar TODOS os agentes (comportamento temporário)
            console.log('⚠️  Nenhum agente fixo cadastrado. Buscando TODOS os agentes.');
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
        } else {
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
            if (agentesFixos.length === 0) {
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
                aviso: agentesFixos.length === 0 
                    ? 'Nenhum agente fixo cadastrado. Mostrando todos os agentes.' 
                    : 'Nenhum dado de DDA encontrado no período selecionado.'
            };
        }
        
        // IMPORTANTE: Os agentes já estão ordenados por total_dda DESC (maior para menor)
        // O 1º quartil sempre terá os MELHORES agentes (maior quantidade de DDA)
        // O 4º quartil sempre terá os PIORES agentes (menor quantidade de DDA)
        
        // Calcular os quartis baseado na QUANTIDADE TOTAL DE DDA (25% da quantidade cada quartil)
        const totalAgentes = rows.length;
        
        // Calcular a quantidade total de DDA de todos os agentes
        const quantidadeTotalGeral = rows.reduce((sum, agente) => {
            return sum + (parseInt(agente.total_dda) || 0);
        }, 0);
        
        // Calcular a quantidade alvo para cada quartil (25% do total)
        const quantidadeAlvoPorQuartil = quantidadeTotalGeral / 4;
        
        // Dividir agentes em quartis baseado na quantidade acumulada de DDA
        // 1º Quartil: Melhores agentes (maior quantidade) até atingir 25% do total
        // 2º Quartil: Próximos agentes até atingir 50% do total
        // 3º Quartil: Próximos agentes até atingir 75% do total
        // 4º Quartil: Restantes agentes (menor quantidade)
        let quartil1 = [];
        let quartil2 = [];
        let quartil3 = [];
        let quartil4 = [];
        
        let quantidadeAcumuladaQuartil1 = 0;
        let quantidadeAcumuladaQuartil2 = 0;
        let quantidadeAcumuladaQuartil3 = 0;
        let quantidadeAcumuladaQuartil4 = 0;
        
        let quartilAtual = 1;
        
        for (const agente of rows) {
            const quantidadeAgente = parseInt(agente.total_dda) || 0;
            
            if (quartilAtual === 1) {
                // 1º Quartil: Melhores agentes (maior quantidade de DDA)
                quartil1.push(agente);
                quantidadeAcumuladaQuartil1 += quantidadeAgente;
                
                // Se atingiu ou ultrapassou 25% da quantidade total, passar para próximo quartil
                if (quantidadeAcumuladaQuartil1 >= quantidadeAlvoPorQuartil) {
                    quartilAtual = 2;
                }
            } else if (quartilAtual === 2) {
                // 2º Quartil: Agentes com bom desempenho
                quartil2.push(agente);
                quantidadeAcumuladaQuartil2 += quantidadeAgente;
                
                // Se atingiu ou ultrapassou 50% da quantidade total, passar para próximo quartil
                if (quantidadeAcumuladaQuartil2 >= quantidadeAlvoPorQuartil) {
                    quartilAtual = 3;
                }
            } else if (quartilAtual === 3) {
                // 3º Quartil: Agentes que precisam de atenção
                quartil3.push(agente);
                quantidadeAcumuladaQuartil3 += quantidadeAgente;
                
                // Se atingiu ou ultrapassou 75% da quantidade total, passar para último quartil
                if (quantidadeAcumuladaQuartil3 >= quantidadeAlvoPorQuartil) {
                    quartilAtual = 4;
                }
            } else {
                // 4º Quartil: Piores agentes (menor quantidade de DDA)
                quartil4.push(agente);
                quantidadeAcumuladaQuartil4 += quantidadeAgente;
            }
        }
        
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

