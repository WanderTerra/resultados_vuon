import { API_ENDPOINTS } from '../config/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
};

export const aloService = {
    getSummary: async (startDate = null, endDate = null) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const url = `${API_ENDPOINTS.aloSummary}${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url, {
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao buscar resumo ALO');
        }
        return data;
    },

    getAcoes: async (startDate = null, endDate = null) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const url = `${API_ENDPOINTS.aloAcoes}${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url, {
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao buscar ações');
        }
        return data;
    },

    getByDate: async (limit = 30, startDate = null, endDate = null) => {
        const params = new URLSearchParams();
        params.append('limit', limit);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const url = `${API_ENDPOINTS.aloByDate}?${params.toString()}`;
        const response = await fetch(url, {
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao buscar dados por data');
        }
        return data;
    },

    getCpcCpcaByDate: async (startDate = null, endDate = null) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const url = `${API_ENDPOINTS.aloCpcCpcaByDate}${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url, {
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao buscar CPC/CPCA por data');
        }
        return data;
    },

    getCpcCpcaSummary: async (startDate = null, endDate = null) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const url = `${API_ENDPOINTS.aloCpcCpcaSummary}${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url, {
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao buscar resumo CPC/CPCA');
        }
        return data;
    },

    getDateRange: async () => {
        const url = API_ENDPOINTS.aloDateRange;
        const response = await fetch(url, {
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao buscar intervalo de datas');
        }
        return data;
    },
};

