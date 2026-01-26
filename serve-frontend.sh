#!/bin/bash

# Script para servir o frontend em produção
# Este script serve os arquivos buildados do frontend

# Mudar para o diretório do dashboard
cd "$(dirname "$0")/dashboard" || exit 1

# Verificar se a pasta dist existe
if [ ! -d "dist" ]; then
    echo "❌ Pasta dist não encontrada. Execute 'npm run build' primeiro."
    exit 1
fi

# Verificar se o node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Porta padrão: 4173, mas pode ser configurada via variável de ambiente
PORT=${FRONTEND_PORT:-4173}

echo "🚀 Iniciando servidor frontend na porta $PORT..."
echo "📁 Servindo arquivos de: $(pwd)/dist"

# Servir usando vite preview (recomendado para Vite)
# --host 0.0.0.0 permite acesso de qualquer IP
# --port define a porta
exec npm run preview -- --port $PORT --host 0.0.0.0

