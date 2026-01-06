import { API_ENDPOINTS } from '../config/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
};

export const produtividadeService = {
    getProdutividadeData: async (agenteId = null, startDate = null, endDate = null, groupBy = 'month') => {
        const params = new URLSearchParams();
        if (agenteId) params.append('agenteId', agenteId);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (groupBy) params.append('groupBy', groupBy);
        // Adicionar timestamp para evitar cache do navegador
        params.append('_t', Date.now().toString());

        const url = `${API_ENDPOINTS.produtividade}${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url, {
            headers: getAuthHeaders(),
            cache: 'no-cache',
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao buscar dados de produtividade');
        }
        return data;
    },

    getTopAgentes: async (limit = 5, startDate = null, endDate = null) => {
        const params = new URLSearchParams();
        if (limit) params.append('limit', limit);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        // Adicionar timestamp para evitar cache do navegador
        params.append('_t', Date.now().toString());

        const url = `${API_ENDPOINTS.produtividadeTopAgentes}${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url, {
            headers: getAuthHeaders(),
            cache: 'no-cache',
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao buscar top agentes');
        }
        return data;
    },
};
