// Cache simples em memória para reduzir queries ao banco
class SimpleCache {
    constructor(ttl = 5 * 60 * 1000) { // 5 minutos por padrão
        this.cache = new Map();
        this.ttl = ttl;
    }

    // Gerar chave de cache baseada nos parâmetros
    generateKey(prefix, ...params) {
        return `${prefix}:${params.join(':')}`;
    }

    // Obter valor do cache
    get(key) {
        const item = this.cache.get(key);
        if (!item) {
            return null;
        }

        // Verificar se expirou
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    // Armazenar valor no cache
    set(key, value, customTtl = null) {
        const ttl = customTtl || this.ttl;
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttl
        });
    }

    // Limpar cache específico ou todo o cache
    clear(key = null) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    // Limpar cache expirado (garbage collection)
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
}

// Instância global do cache - TTL aumentado para 30 minutos para melhor performance
// IMPORTANTE: Views no MySQL são recalculadas a cada consulta, então o cache é crítico
const cache = new SimpleCache(30 * 60 * 1000); // 30 minutos

// Limpar cache expirado a cada 20 minutos
setInterval(() => {
    cache.cleanup();
}, 20 * 60 * 1000);

module.exports = cache;

