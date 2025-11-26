// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
    login: `${API_BASE_URL}/api/auth/login`,
    dashboardData: `${API_BASE_URL}/api/dashboard/data`,
    blocoData: (bloco) => `${API_BASE_URL}/api/dashboard/bloco/${bloco}`,
    aloSummary: `${API_BASE_URL}/api/alo/summary`,
    aloAcoes: `${API_BASE_URL}/api/alo/acoes`,
    aloByDate: `${API_BASE_URL}/api/alo/by-date`,
    aloCpcCpcaByDate: `${API_BASE_URL}/api/alo/cpc-cpca/by-date`,
    aloCpcCpcaSummary: `${API_BASE_URL}/api/alo/cpc-cpca/summary`,
};

