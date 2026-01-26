/**
 * Utilitários para verificar permissões do usuário
 */

/**
 * Verifica se o usuário tem uma permissão específica
 * @param {string} permission - Código da permissão
 * @returns {boolean}
 */
export const hasPermission = (permission) => {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return false;
        
        const user = JSON.parse(userStr);
        const permissions = user?.permissions || [];
        
        return permissions.includes(permission);
    } catch {
        return false;
    }
};

/**
 * Verifica se o usuário tem pelo menos uma das permissões fornecidas
 * @param {string[]} permissions - Array de códigos de permissões
 * @returns {boolean}
 */
export const hasAnyPermission = (permissions) => {
    return permissions.some(permission => hasPermission(permission));
};

/**
 * Verifica se o usuário tem todas as permissões fornecidas
 * @param {string[]} permissions - Array de códigos de permissões
 * @returns {boolean}
 */
export const hasAllPermissions = (permissions) => {
    return permissions.every(permission => hasPermission(permission));
};

/**
 * Retorna todas as permissões do usuário atual
 * @returns {string[]}
 */
export const getUserPermissions = () => {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return [];
        
        const user = JSON.parse(userStr);
        return user?.permissions || [];
    } catch {
        return [];
    }
};

