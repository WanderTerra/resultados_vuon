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
        
        // Distribuição tradicional de quartis: dividir os agentes em 4 grupos iguais (25% cada)
        // Baseado no número de agentes, não na quantidade acumulada de DDA
        const totalAgentes = rows.length;
        
        // Calcular o tamanho de cada quartil (25% dos agentes)
        // Se não dividir igualmente, distribuir os restantes do maior para o menor quartil
        const tamanhoQuartil = Math.floor(totalAgentes / 4);
        const resto = totalAgentes % 4;
        
        // Distribuir os restantes: 1º quartil recebe primeiro, depois 2º, 3º, 4º
        const tamanhoQuartil1 = tamanhoQuartil + (resto >= 1 ? 1 : 0);
        const tamanhoQuartil2 = tamanhoQuartil + (resto >= 2 ? 1 : 0);
        const tamanhoQuartil3 = tamanhoQuartil + (resto >= 3 ? 1 : 0);
        const tamanhoQuartil4 = tamanhoQuartil;
        
        // Dividir agentes em quartis baseado na posição na lista ordenada
        // 1º Quartil: Top 25% dos agentes (maior quantidade de DDA)
        // 2º Quartil: Próximos 25% dos agentes
        // 3º Quartil: Próximos 25% dos agentes
        // 4º Quartil: Bottom 25% dos agentes (menor quantidade de DDA)
        const quartil1 = rows.slice(0, tamanhoQuartil1);
        const quartil2 = rows.slice(tamanhoQuartil1, tamanhoQuartil1 + tamanhoQuartil2);
        const quartil3 = rows.slice(tamanhoQuartil1 + tamanhoQuartil2, tamanhoQuartil1 + tamanhoQuartil2 + tamanhoQuartil3);
        const quartil4 = rows.slice(tamanhoQuartil1 + tamanhoQuartil2 + tamanhoQuartil3);
        
        console.log(`📊 Quartis - Distribuição tradicional:`);
        console.log(`   Total de agentes: ${totalAgentes}`);
        console.log(`   1º Quartil: ${quartil1.length} agentes (${((quartil1.length / totalAgentes) * 100).toFixed(1)}%)`);
        console.log(`   2º Quartil: ${quartil2.length} agentes (${((quartil2.length / totalAgentes) * 100).toFixed(1)}%)`);
        console.log(`   3º Quartil: ${quartil3.length} agentes (${((quartil3.length / totalAgentes) * 100).toFixed(1)}%)`);
        console.log(`   4º Quartil: ${quartil4.length} agentes (${((quartil4.length / totalAgentes) * 100).toFixed(1)}%)`);
        
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

