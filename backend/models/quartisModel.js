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
        
        // Buscar todos os agentes com suas quantidades de DDA
        const query = `
            SELECT 
                agente,
                COUNT(*) as total_dda
            FROM vuon_resultados
            WHERE acao = 'DDA'
                AND agente != '0'
                AND agente IS NOT NULL
                AND agente != ''
                ${dateFilter}
            GROUP BY agente
            ORDER BY total_dda DESC
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
                    quartil1: { min: 0, max: 0, media: 0 },
                    quartil2: { min: 0, max: 0, media: 0 },
                    quartil3: { min: 0, max: 0, media: 0 },
                    quartil4: { min: 0, max: 0, media: 0 }
                }
            };
        }
        
        // Calcular os índices dos quartis
        const totalAgentes = rows.length;
        const tamanhoQuartil = Math.ceil(totalAgentes / 4);
        
        // Dividir em quartis
        const quartil1 = rows.slice(0, tamanhoQuartil);
        const quartil2 = rows.slice(tamanhoQuartil, tamanhoQuartil * 2);
        const quartil3 = rows.slice(tamanhoQuartil * 2, tamanhoQuartil * 3);
        const quartil4 = rows.slice(tamanhoQuartil * 3);
        
        // Calcular estatísticas para cada quartil
        const calcularEstatisticas = (quartil) => {
            if (quartil.length === 0) {
                return { min: 0, max: 0, media: 0 };
            }
            const valores = quartil.map(a => a.total_dda);
            const min = Math.min(...valores);
            const max = Math.max(...valores);
            const media = valores.reduce((a, b) => a + b, 0) / valores.length;
            return { min, max, media: Math.round(media * 100) / 100 };
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

