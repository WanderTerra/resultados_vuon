/**
 * Utilitários para manipulação de datas
 */

/**
 * Calcula a data de início e fim para os últimos 3 meses
 * Retorna um objeto com startDate e endDate no formato YYYY-MM-DD
 */
export const getLast3Months = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // Data de fim: hoje
    const endDate = new Date(today);
    
    // Data de início: 3 meses atrás (primeiro dia do mês de 3 meses atrás)
    const startDate = new Date(today);
    startDate.setMonth(today.getMonth() - 2); // 2 meses atrás (para ter 3 meses incluindo o atual)
    startDate.setDate(1); // Primeiro dia do mês
    startDate.setHours(0, 0, 0, 0);
    
    return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
    };
};

