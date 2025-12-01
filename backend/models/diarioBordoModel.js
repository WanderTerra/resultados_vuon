const { getDB } = require('../config/db');

class DiarioBordoModel {
    // Função auxiliar para definir o bloco baseado em dias de atraso
    static getBlocoCondition(bloco) {
        switch(bloco) {
            case 1:
                return "atraso >= 61 AND atraso <= 90";
            case 2:
                return "atraso >= 91 AND atraso <= 180";
            case 3:
                return "atraso >= 181 AND atraso <= 360";
            case 'wo':
                return "atraso >= 360 AND atraso <= 9999";
            default:
                return "1=1";
        }
    }

    // Buscar acordos (DDA e ACD) por hora, separados por blocos
    // Assumindo que a coluna 'data' pode ser DATE ou DATETIME
    // Se for DATETIME, extraímos a hora. Se houver coluna 'hora' separada, usamos ela.
    static async getAcordosPorHora(bloco = null, startDate = null, endDate = null) {
        const db = await getDB();
        
        let blocoCondition = '';
        if (bloco) {
            blocoCondition = `AND ${this.getBlocoCondition(bloco)}`;
        }
        
        let dateFilter = '';
        if (startDate && endDate) {
            dateFilter = `AND DATE(data) >= '${startDate}' AND DATE(data) <= '${endDate}'`;
        }
        
        // Query que tenta extrair hora de diferentes formas:
        // 1. Se houver coluna 'hora' separada, usa ela
        // 2. Se 'data' for DATETIME, extrai HOUR(data)
        // 3. Se 'data' for DATE, agrupa por data (sem hora) - HOUR retornará NULL, usamos COALESCE
        const query = `
            SELECT 
                COALESCE(HOUR(data), 0) as hora,
                DATE(data) as data,
                COUNT(CASE WHEN acao = 'DDA' THEN 1 END) as dda,
                COUNT(CASE WHEN acao = 'ACD' THEN 1 END) as acd,
                COUNT(CASE WHEN acao IN ('DDA', 'ACD') THEN 1 END) as total_acordos
            FROM vuon_resultados
            WHERE acao IN ('DDA', 'ACD')
                AND agente != '0'
                AND agente IS NOT NULL
                AND agente != ''
                ${blocoCondition}
                ${dateFilter}
            GROUP BY DATE(data), COALESCE(HOUR(data), 0)
            ORDER BY DATE(data) ASC, COALESCE(HOUR(data), 0) ASC
        `;
        
        const [rows] = await db.execute(query);
        return rows;
    }

    // Buscar acordos por hora para todos os blocos
    // Se dataSelecionada for fornecida, usa ela. Senão, usa o dia mais recente
    static async getAcordosPorHoraTodosBlocos(dataSelecionada = null) {
        const db = await getDB();
        
        // Primeiro, verificar se existe coluna 'hora' separada
        let temColunaHora = false;
        try {
            const [columns] = await db.execute(`
                SELECT COLUMN_NAME 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'vuon_resultados'
                AND COLUMN_NAME = 'hora'
            `);
            temColunaHora = columns.length > 0;
        } catch (error) {
            console.warn('⚠️  Erro ao verificar coluna hora, assumindo que não existe:', error.message);
            temColunaHora = false;
        }
        
        let dataParaUsar;
        
        if (dataSelecionada) {
            // Usar a data fornecida
            dataParaUsar = dataSelecionada;
        } else {
            // Buscar a data mais recente que tem acordos (DDA ou ACD)
            const [maxDateRows] = await db.execute(`
                SELECT MAX(DATE(data)) as data_maxima
                FROM vuon_resultados
                WHERE acao IN ('DDA', 'ACD')
                    AND agente != '0'
                    AND agente IS NOT NULL
                    AND agente != ''
            `);
            
            const dataMaxima = maxDateRows[0]?.data_maxima;
            
            if (!dataMaxima) {
                return [];
            }
            
            dataParaUsar = dataMaxima;
        }
        
        // Garantir que a data seja uma string no formato YYYY-MM-DD
        let dataStr;
        if (dataParaUsar instanceof Date) {
            dataStr = dataParaUsar.toISOString().split('T')[0];
        } else if (typeof dataParaUsar === 'string') {
            dataStr = dataParaUsar.split('T')[0];
        } else {
            dataStr = String(dataParaUsar);
        }
        
        // Query que agrupa por hora e bloco apenas do dia mais recente
        // Se houver coluna 'hora' separada, extrai a hora dela (HH:MM:SS -> HH)
        // Senão, tenta HOUR(data) se for DATETIME
        let horaSelect, horaGroupBy;
        if (temColunaHora) {
            // A coluna hora é TIME (HH:MM:SS), extrair apenas a hora (HH)
            horaSelect = 'COALESCE(HOUR(hora), 0) as hora';
            horaGroupBy = 'COALESCE(HOUR(hora), 0)';
        } else {
            // Tenta extrair hora de DATETIME, se não for DATETIME retorna 0
            horaSelect = 'COALESCE(HOUR(data), 0) as hora';
            horaGroupBy = 'COALESCE(HOUR(data), 0)';
        }
        
        const query = `
            SELECT 
                ${horaSelect},
                DATE(data) as data,
                CASE 
                    WHEN atraso >= 61 AND atraso <= 90 THEN 1
                    WHEN atraso >= 91 AND atraso <= 180 THEN 2
                    WHEN atraso >= 181 AND atraso <= 360 THEN 3
                    WHEN atraso >= 360 AND atraso <= 9999 THEN 'wo'
                    ELSE NULL
                END as bloco,
                COUNT(CASE WHEN acao = 'DDA' THEN 1 END) as dda,
                COUNT(CASE WHEN acao = 'ACD' THEN 1 END) as acd,
                COUNT(CASE WHEN acao IN ('DDA', 'ACD') THEN 1 END) as total_acordos
            FROM vuon_resultados
            WHERE acao IN ('DDA', 'ACD')
                AND agente != '0'
                AND agente IS NOT NULL
                AND agente != ''
                AND DATE(data) = ?
                AND (
                    (atraso >= 61 AND atraso <= 90) OR
                    (atraso >= 91 AND atraso <= 180) OR
                    (atraso >= 181 AND atraso <= 360) OR
                    (atraso >= 360 AND atraso <= 9999)
                )
            GROUP BY ${horaGroupBy}, bloco
            ORDER BY ${horaGroupBy} ASC, bloco ASC
        `;
        
        try {
            const [rows] = await db.execute(query, [dataStr]);
            
            // Se não houver dados para a data selecionada, buscar a data mais recente com dados
            if (rows.length === 0 && dataSelecionada) {
                console.log(`⚠️  Nenhum dado encontrado para a data ${dataStr}. Buscando data mais recente com dados...`);
                
                // Buscar a data mais recente que tem acordos
                const [maxDateRows] = await db.execute(`
                    SELECT MAX(DATE(data)) as data_maxima
                    FROM vuon_resultados
                    WHERE acao IN ('DDA', 'ACD')
                        AND agente != '0'
                        AND agente IS NOT NULL
                        AND agente != ''
                        AND DATE(data) < ?
                `, [dataStr]);
                
                const dataMaxima = maxDateRows[0]?.data_maxima;
                
                if (dataMaxima) {
                    // Garantir que a data seja uma string no formato YYYY-MM-DD
                    let dataMaximaStr;
                    if (dataMaxima instanceof Date) {
                        dataMaximaStr = dataMaxima.toISOString().split('T')[0];
                    } else if (typeof dataMaxima === 'string') {
                        dataMaximaStr = dataMaxima.split('T')[0];
                    } else {
                        dataMaximaStr = String(dataMaxima);
                    }
                    
                    console.log(`📊 Usando data mais recente com dados: ${dataMaximaStr}`);
                    
                    // Executar query novamente com a data mais recente
                    const [newRows] = await db.execute(query, [dataMaximaStr]);
                    
                    // Adicionar flag indicando que a data foi alterada
                    if (newRows.length > 0) {
                        newRows._dataAlterada = true;
                        newRows._dataOriginal = dataStr;
                        newRows._dataUsada = dataMaximaStr;
                    }
                    
                    return newRows;
                }
            }
            
            // Log para debug: verificar se estamos pegando horas diferentes
            if (rows.length > 0) {
                const horasUnicas = [...new Set(rows.map(r => r.hora))];
                console.log(`📊 Diário de Bordo - Data: ${dataStr}, Horas encontradas: ${horasUnicas.join(', ')}, Total de registros: ${rows.length}`);
                if (horasUnicas.length === 1 && horasUnicas[0] === 0) {
                    console.warn('⚠️  ATENÇÃO: Todos os registros estão na hora 00:00. Isso pode indicar que a coluna "data" é apenas DATE (sem hora) ou não há coluna "hora" separada.');
                }
            }
            
            return rows;
        } catch (error) {
            console.error('❌ Erro na query do diário de bordo:', error);
            console.error('Query:', query);
            console.error('Parâmetros:', [dataStr]);
            throw error;
        }
    }
}

module.exports = DiarioBordoModel;

