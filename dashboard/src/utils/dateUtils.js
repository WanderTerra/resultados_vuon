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

/**
 * Retorna o mês atual no formato YYYY-MM
 */
export const getCurrentMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

const toYYYYMMDD = (d) => d.toISOString().split('T')[0];

/** Esta semana: domingo a hoje */
export const getEstaSemana = () => {
    const today = new Date();
    const day = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return { startDate: toYYYYMMDD(start), endDate: toYYYYMMDD(today) };
};

/** Semana passada: domingo a sábado */
export const getSemanaPassada = () => {
    const today = new Date();
    const day = today.getDay();
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - day - 7);
    lastSunday.setHours(0, 0, 0, 0);
    const lastSaturday = new Date(lastSunday);
    lastSaturday.setDate(lastSunday.getDate() + 6);
    return { startDate: toYYYYMMDD(lastSunday), endDate: toYYYYMMDD(lastSaturday) };
};

/** Este mês: primeiro ao último dia do mês */
export const getEsteMes = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { startDate: toYYYYMMDD(start), endDate: toYYYYMMDD(end) };
};

/** Mês passado: primeiro ao último dia */
export const getMesPassado = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { startDate: toYYYYMMDD(start), endDate: toYYYYMMDD(end) };
};

