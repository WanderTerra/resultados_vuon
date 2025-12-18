import { API_ENDPOINTS } from '../config/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
};

export const spinsService = {
    getSpinsLastDay: async () => {
        const params = new URLSearchParams();
        params.append('_t', Date.now().toString());
        const url = `${API_ENDPOINTS.spinsLastDay}?${params.toString()}`;
        const response = await fetch(url, {
            headers: getAuthHeaders(),
            cache: 'no-cache',
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao buscar spins do último dia');
        }
        return data;
    }
};


