const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando arquivo .env...\n');

const envPath = path.join(__dirname, '../.env');

if (!fs.existsSync(envPath)) {
    console.error('❌ Arquivo .env não encontrado em:', envPath);
    process.exit(1);
}

console.log('✅ Arquivo .env encontrado em:', envPath);
console.log('');

// Read and display .env content
const envContent = fs.readFileSync(envPath, 'utf8');
console.log('📄 Conteúdo do arquivo .env (raw):');
console.log('---');
console.log(envContent);
console.log('---');
console.log('');

// Show each line with its byte representation
console.log('📋 Linhas do arquivo (com análise):');
const lines = envContent.split(/\r?\n/);
lines.forEach((line, index) => {
    if (line.trim()) {
        const hasSSH = line.includes('SSH') || line.includes('USE_SSH');
        const marker = hasSSH ? '🔍' : '  ';
        console.log(`${marker} Linha ${index + 1}: "${line}" (${line.length} chars)`);
        if (hasSSH) {
            // Show byte representation for SSH lines
            const bytes = Buffer.from(line, 'utf8');
            console.log(`      Bytes: [${Array.from(bytes).join(', ')}]`);
        }
    }
});
console.log('');

// Check for specific variables (already split above)
const sshVars = ['USE_SSH_TUNNEL', 'SSH_HOST', 'SSH_PORT', 'SSH_USER', 'SSH_PASSWORD'];
const dbVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

console.log('🔍 Verificando variáveis SSH:');
sshVars.forEach(varName => {
    // Check if line contains the variable (more flexible)
    const found = lines.some(line => {
        const trimmed = line.trim();
        return trimmed.startsWith(varName + '=') || trimmed.startsWith('#' + varName + '=');
    });
    
    // Also show the actual line if found
    const line = lines.find(l => l.trim().startsWith(varName + '='));
    if (line) {
        console.log(`   ${varName}: ✅ encontrada - "${line.trim()}"`);
    } else {
        console.log(`   ${varName}: ❌ não encontrada`);
        // Show lines that might be similar
        const similar = lines.filter(l => l.includes(varName));
        if (similar.length > 0) {
            console.log(`      Linhas similares encontradas:`, similar.map(l => `"${l.trim()}"`));
        }
    }
});

console.log('\n🔍 Verificando variáveis DB:');
dbVars.forEach(varName => {
    const line = lines.find(l => l.trim().startsWith(varName + '='));
    if (line) {
        console.log(`   ${varName}: ✅ encontrada - "${line.trim()}"`);
    } else {
        console.log(`   ${varName}: ❌ não encontrada`);
    }
});

// Try to load with dotenv (clear cache first)
delete require.cache[require.resolve('dotenv')];
console.log('\n🔍 Testando carregamento com dotenv:');
const result = require('dotenv').config({ path: envPath });

if (result.error) {
    console.error('❌ Erro ao carregar .env:', result.error);
} else {
    console.log('✅ dotenv carregado:', result.parsed ? Object.keys(result.parsed).length + ' variáveis' : 'sem parsed');
}

console.log('\n📊 Variáveis carregadas no process.env:');
console.log('   USE_SSH_TUNNEL:', process.env.USE_SSH_TUNNEL || 'undefined');
console.log('   SSH_HOST:', process.env.SSH_HOST || 'undefined');
console.log('   SSH_PORT:', process.env.SSH_PORT || 'undefined');
console.log('   SSH_USER:', process.env.SSH_USER || 'undefined');
console.log('   SSH_PASSWORD:', process.env.SSH_PASSWORD ? '***' + process.env.SSH_PASSWORD.slice(-3) : 'undefined');
console.log('   DB_NAME:', process.env.DB_NAME || 'undefined');
console.log('   DB_HOST:', process.env.DB_HOST || 'undefined');

// Show all env vars that start with SSH or USE_SSH
console.log('\n🔍 Todas as variáveis SSH no process.env:');
Object.keys(process.env)
    .filter(key => key.includes('SSH') || key.includes('USE_SSH'))
    .forEach(key => {
        const value = process.env[key];
        const masked = key.includes('PASSWORD') ? '***' + value.slice(-3) : value;
        console.log(`   ${key}: ${masked}`);
    });

