import { API_ENDPOINTS } from '../config/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
};

export const clientesVirgensService = {
    getClientesVirgens: async (bloco = null) => {
        const params = new URLSearchParams();
        if (bloco) {
            params.append('bloco', bloco);
        }
        // Adicionar timestamp para evitar cache do navegador
        params.append('_t', Date.now().toString());
        
        const url = `${API_ENDPOINTS.clientesVirgens}${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url, {
            headers: getAuthHeaders(),
            cache: 'no-cache',
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao buscar clientes virgens');
        }
        return data;
    },
};

