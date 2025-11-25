// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
    login: `${API_BASE_URL}/api/auth/login`,
    dashboardData: `${API_BASE_URL}/api/dashboard/data`,
};

