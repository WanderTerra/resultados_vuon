const SimpleCache = require('../utils/cache');

/**
 * Script para limpar todo o cache
 */
const clearCache = () => {
    try {
        console.log('🗑️  Limpando todo o cache...\n');
        
        const cache = new SimpleCache();
        cache.clear();
        
        console.log('✅ Cache limpo com sucesso!\n');
        console.log('💡 Agora recarregue a página do dashboard para ver os dados atualizados.\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao limpar cache:', error);
        process.exit(1);
    }
};

clearCache();

