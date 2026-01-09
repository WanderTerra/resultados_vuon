import { API_ENDPOINTS } from '../config/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
};

export const clientesVirgensService = {
    getClientesVirgens: async (bloco = null, startDate = null, endDate = null) => {
        const params = new URLSearchParams();
        if (bloco !== null && bloco !== undefined && bloco !== '') params.append('bloco', String(bloco));
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        // evitar cache do navegador / proxies
        params.append('_t', Date.now().toString());

        const url = `${API_ENDPOINTS.clientesVirgens}${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url, {
            headers: getAuthHeaders(),
            cache: 'no-cache',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Erro ao buscar clientes virgens');
        }

        return await response.json();
    },
};
