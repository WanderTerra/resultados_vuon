const { getDB } = require('../config/db');

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
        
        // Buscar todos os agentes com a soma dos valores de DDA no período
        const query = `
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
            ORDER BY valor_total DESC
        `;
        
        const [rows] = await db.execute(query, params);
        
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
                }
            };
        }
        
        // IMPORTANTE: Os agentes já estão ordenados por valor_total DESC (maior para menor)
        // O 1º quartil sempre terá os MELHORES agentes (maior valor total)
        // O 4º quartil sempre terá os PIORES agentes (menor valor total)
        
        // Calcular os quartis baseado no VALOR TOTAL (25% do valor cada quartil)
        const totalAgentes = rows.length;
        
        // Calcular o valor total de todos os agentes
        const valorTotalGeral = rows.reduce((sum, agente) => {
            return sum + (parseFloat(agente.valor_total) || 0);
        }, 0);
        
        // Calcular o valor alvo para cada quartil (25% do total)
        const valorAlvoPorQuartil = valorTotalGeral / 4;
        
        // Dividir agentes em quartis baseado no valor acumulado
        // 1º Quartil: Melhores agentes (maior valor) até atingir 25% do total
        // 2º Quartil: Próximos agentes até atingir 50% do total
        // 3º Quartil: Próximos agentes até atingir 75% do total
        // 4º Quartil: Restantes agentes (menor valor)
        let quartil1 = [];
        let quartil2 = [];
        let quartil3 = [];
        let quartil4 = [];
        
        let valorAcumuladoQuartil1 = 0;
        let valorAcumuladoQuartil2 = 0;
        let valorAcumuladoQuartil3 = 0;
        let valorAcumuladoQuartil4 = 0;
        
        let quartilAtual = 1;
        
        for (const agente of rows) {
            const valorAgente = parseFloat(agente.valor_total) || 0;
            
            if (quartilAtual === 1) {
                // 1º Quartil: Melhores agentes (maior valor total)
                quartil1.push(agente);
                valorAcumuladoQuartil1 += valorAgente;
                
                // Se atingiu ou ultrapassou 25% do valor total, passar para próximo quartil
                if (valorAcumuladoQuartil1 >= valorAlvoPorQuartil) {
                    quartilAtual = 2;
                }
            } else if (quartilAtual === 2) {
                // 2º Quartil: Agentes com bom desempenho
                quartil2.push(agente);
                valorAcumuladoQuartil2 += valorAgente;
                
                // Se atingiu ou ultrapassou 50% do valor total, passar para próximo quartil
                if (valorAcumuladoQuartil2 >= valorAlvoPorQuartil) {
                    quartilAtual = 3;
                }
            } else if (quartilAtual === 3) {
                // 3º Quartil: Agentes que precisam de atenção
                quartil3.push(agente);
                valorAcumuladoQuartil3 += valorAgente;
                
                // Se atingiu ou ultrapassou 75% do valor total, passar para último quartil
                if (valorAcumuladoQuartil3 >= valorAlvoPorQuartil) {
                    quartilAtual = 4;
                }
            } else {
                // 4º Quartil: Piores agentes (menor valor total)
                quartil4.push(agente);
                valorAcumuladoQuartil4 += valorAgente;
            }
        }
        
        // Calcular estatísticas para cada quartil (baseado no valor total)
        const calcularEstatisticas = (quartil) => {
            if (quartil.length === 0) {
                return { min: 0, max: 0, media: 0, total: 0 };
            }
            const valores = quartil.map(a => parseFloat(a.valor_total) || 0);
            const min = Math.min(...valores);
            const max = Math.max(...valores);
            const total = valores.reduce((a, b) => a + b, 0);
            const media = total / valores.length;
            return { 
                min: Math.round(min * 100) / 100, 
                max: Math.round(max * 100) / 100, 
                media: Math.round(media * 100) / 100,
                total: Math.round(total * 100) / 100
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

