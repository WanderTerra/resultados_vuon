// API Configuration
// Prioriza VITE_API_URL do .env, senão usa valores padrão
const API_URL = import.meta.env.VITE_API_URL || 
    (import.meta.env.PROD 
        ? 'https://api-resultados.vuon.portes.com.br'
        : 'http://localhost:3002');

export const API_BASE_URL = API_URL;

export const API_ENDPOINTS = {
    login: `${API_BASE_URL}/api/auth/login`,
    verifyToken: `${API_BASE_URL}/api/auth/verify`,
    createUser: `${API_BASE_URL}/api/auth/create-user`,
    dashboardData: `${API_BASE_URL}/api/dashboard/data`,
    blocoData: (bloco) => `${API_BASE_URL}/api/dashboard/bloco/${bloco}`,
    aloSummary: `${API_BASE_URL}/api/alo/summary`,
    aloAcoes: `${API_BASE_URL}/api/alo/acoes`,
    aloByDate: `${API_BASE_URL}/api/alo/by-date`,
    aloCpcCpcaByDate: `${API_BASE_URL}/api/alo/cpc-cpca/by-date`,
    aloCpcCpcaSummary: `${API_BASE_URL}/api/alo/cpc-cpca/summary`,
    aloDateRange: `${API_BASE_URL}/api/alo/date-range`,
    diarioBordo: `${API_BASE_URL}/api/dashboard/diario-bordo`,
    produtividade: `${API_BASE_URL}/api/dashboard/produtividade`,
    produtividadeTopAgentes: `${API_BASE_URL}/api/dashboard/produtividade/top-agentes`,
    clientesVirgens: `${API_BASE_URL}/api/dashboard/clientes-virgens`,
    comparativo: `${API_BASE_URL}/api/dashboard/comparativo`,
    comparativoAgentes: `${API_BASE_URL}/api/dashboard/comparativo/agentes`,
};