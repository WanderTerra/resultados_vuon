import { API_ENDPOINTS } from '../config/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
};

export const aloService = {
    getSummary: async () => {
        const response = await fetch(API_ENDPOINTS.aloSummary, {
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao buscar resumo ALO');
        }
        return data;
    },

    getAcoes: async () => {
        const response = await fetch(API_ENDPOINTS.aloAcoes, {
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao buscar ações');
        }
        return data;
    },

    getByDate: async (limit = 30) => {
        const response = await fetch(`${API_ENDPOINTS.aloByDate}?limit=${limit}`, {
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao buscar dados por data');
        }
        return data;
    },

    getCpcCpcaByDate: async () => {
        const response = await fetch(API_ENDPOINTS.aloCpcCpcaByDate, {
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao buscar CPC/CPCA por data');
        }
        return data;
    },

    getCpcCpcaSummary: async () => {
        const response = await fetch(API_ENDPOINTS.aloCpcCpcaSummary, {
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao buscar resumo CPC/CPCA');
        }
        return data;
    },
};

