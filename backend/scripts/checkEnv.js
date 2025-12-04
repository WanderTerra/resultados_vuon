require('dotenv').config();

console.log('📋 Verificando configuração do .env...\n');

const useSSH = process.env.USE_SSH_TUNNEL === 'true';

console.log('🔍 Configuração atual:');
console.log(`   USE_SSH_TUNNEL: ${process.env.USE_SSH_TUNNEL || 'não definido (será false)'}`);
console.log('');

if (useSSH) {
    console.log('✅ Modo SSH ativado\n');
    console.log('📡 Configuração SSH:');
    console.log(`   SSH_HOST: ${process.env.SSH_HOST || 'não definido'}`);
    console.log(`   SSH_PORT: ${process.env.SSH_PORT || 'não definido'}`);
    console.log(`   SSH_USER: ${process.env.SSH_USER || 'não definido'}`);
    console.log(`   SSH_PASSWORD: ${process.env.SSH_PASSWORD ? '***' + process.env.SSH_PASSWORD.slice(-3) : 'não definido'}`);
    console.log('');
    console.log('🗄️  Configuração do Banco (via SSH):');
    console.log(`   DB_REMOTE_HOST: ${process.env.DB_REMOTE_HOST || 'não definido'}`);
    console.log(`   DB_REMOTE_PORT: ${process.env.DB_REMOTE_PORT || 'não definido'}`);
    console.log(`   DB_USER: ${process.env.DB_USER || 'não definido'}`);
    console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-3) : 'não definido'}`);
    console.log(`   DB_NAME: ${process.env.DB_NAME || 'não definido'}`);
    console.log('');
    
    // Check if ssh2 is installed
    try {
        require('ssh2');
        console.log('✅ ssh2 está instalado');
    } catch (error) {
        console.log('❌ ssh2 NÃO está instalado!');
        console.log('   Execute: npm install ssh2');
    }
} else {
    console.log('⚠️  Modo SSH NÃO está ativado\n');
    console.log('📡 Tentando conexão direta:');
    console.log(`   DB_HOST: ${process.env.DB_HOST || 'localhost (padrão)'}`);
    console.log(`   DB_PORT: ${process.env.DB_PORT || '3306 (padrão)'}`);
    console.log(`   DB_USER: ${process.env.DB_USER || 'root (padrão)'}`);
    console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-3) : 'portes2025 (padrão)'}`);
    console.log(`   DB_NAME: ${process.env.DB_NAME || 'vuon (padrão)'}`);
    console.log('');
    console.log('💡 Como você usa SSH no DBeaver, você precisa:');
    console.log('   1. Adicionar USE_SSH_TUNNEL=true no .env');
    console.log('   2. Configurar as credenciais SSH');
    console.log('   3. Instalar ssh2: npm install ssh2');
}

console.log('\n📝 Exemplo de .env para SSH:');
console.log('USE_SSH_TUNNEL=true');
console.log('SSH_HOST=82.25.69.143');
console.log('SSH_PORT=22');
console.log('SSH_USER=portes');
console.log('SSH_PASSWORD=Portes@2025!@');
console.log('DB_REMOTE_HOST=localhost');
console.log('DB_REMOTE_PORT=3306');
console.log('DB_USER=root');
console.log('DB_PASSWORD=portes2025');
console.log('DB_NAME=vuon');
console.log('JWT_SECRET=your-secret-key');
console.log('PORT=3000');

