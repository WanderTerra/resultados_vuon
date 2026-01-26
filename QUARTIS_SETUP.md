# Guia de Configuração - Página Quartis

## ✅ Status da Implementação

Todos os arquivos foram criados e testados localmente com sucesso.

## 📁 Arquivos Criados/Modificados

### Backend:
- ✅ `backend/models/quartisModel.js` - Model para buscar e calcular quartis
- ✅ `backend/controllers/quartisController.js` - Controller da rota
- ✅ `backend/routes/dashboardRoutes.js` - Rota adicionada (linha 37)

### Frontend:
- ✅ `dashboard/src/pages/Quartis.jsx` - Página completa
- ✅ `dashboard/src/App.jsx` - Rota adicionada
- ✅ `dashboard/src/components/Layout.jsx` - Link no menu adicionado
- ✅ `dashboard/src/config/api.js` - Endpoint adicionado

## 🔧 Como Verificar se Está Funcionando

### 1. Teste Local (já passou ✅)
```bash
cd backend
node test-quartis-route.js
```

### 2. Verificar no Servidor de Produção

#### Passo 1: Verificar se os arquivos existem no servidor
```bash
# No servidor de produção, verifique:
ls -la backend/models/quartisModel.js
ls -la backend/controllers/quartisController.js
ls -la backend/routes/dashboardRoutes.js
```

#### Passo 2: Verificar se a rota está registrada
```bash
# Verifique o conteúdo do arquivo de rotas
grep -n "quartis" backend/routes/dashboardRoutes.js
```

#### Passo 3: Reiniciar o servidor
```bash
# Se usar PM2:
pm2 restart all
# ou
pm2 restart <nome-do-processo>

# Se usar systemd:
sudo systemctl restart <servico>

# Se usar npm/node diretamente:
# Pare o processo (Ctrl+C) e reinicie:
cd backend
npm start
```

#### Passo 4: Verificar logs do servidor
Após reiniciar, faça uma requisição e verifique os logs:
```bash
# PM2:
pm2 logs

# systemd:
sudo journalctl -u <servico> -f

# Node direto:
# Os logs aparecerão no console
```

#### Passo 5: Testar a rota
```bash
# Com curl:
curl -X GET "https://api-resultados.vuon.portes.com.br/api/dashboard/quartis" \
  -H "Authorization: Bearer <seu-token>"

# Ou no navegador (com token):
# https://api-resultados.vuon.portes.com.br/api/dashboard/quartis?token=<seu-token>
```

## 🐛 Troubleshooting

### Erro 404 (Rota não encontrada)
**Causa:** Servidor não foi reiniciado após adicionar a rota.

**Solução:**
1. Verifique se os arquivos existem no servidor
2. Reinicie o servidor
3. Verifique os logs para erros de carregamento

### Erro 500 (Erro interno)
**Causa:** Erro no código ou conexão com banco de dados.

**Solução:**
1. Verifique os logs do servidor para detalhes do erro
2. Verifique se o banco de dados está acessível
3. Verifique se a tabela `vuon_resultados` existe e tem dados

### Erro de autenticação
**Causa:** Token inválido ou expirado.

**Solução:**
1. Faça login novamente
2. Verifique se o token está sendo enviado no header Authorization

## 📊 Funcionalidades da Página

A página Quartis exibe:
- **1º Quartil:** Agentes com maior produção de DDA (verde)
- **2º Quartil:** Agentes com boa produção (azul)
- **3º Quartil:** Agentes que precisam de atenção (amarelo)
- **4º Quartil:** Agentes com produção muito baixa (vermelho)

Cada quartil mostra:
- Número de agentes
- Média de DDA por agente
- Tabela detalhada com todos os agentes e seus totais
- Gráfico comparativo entre quartis

## 🔄 Próximos Passos

1. **Reiniciar o servidor de produção**
2. **Testar a rota** após reiniciar
3. **Verificar se a página carrega** corretamente no frontend
4. **Testar filtros de data** (opcional)

## 📝 Notas

- A rota não requer autenticação especial (usa o mesmo middleware das outras rotas)
- Os dados são calculados em tempo real a partir da tabela `vuon_resultados`
- Filtros de data são opcionais - se não fornecidos, busca todos os dados

