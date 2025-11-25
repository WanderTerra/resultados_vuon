# Backend - Resultados Vuon

## Configuração Inicial

### 1. Instalar Dependências
```bash
npm install
```

**Importante:** Se você usar túnel SSH, instale também:
```bash
npm install ssh2
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na pasta `backend`. Veja o arquivo `ENV_EXAMPLE.md` para exemplos de configuração.

#### Para conexão com túnel SSH (servidores remotos):

```env
# SSH Tunnel Configuration
USE_SSH_TUNNEL=true
SSH_HOST=82.25.69.143
SSH_PORT=22
SSH_USER=portes
SSH_PASSWORD=Portes@2025!@

# Database Configuration (via SSH tunnel)
DB_REMOTE_HOST=localhost
DB_REMOTE_PORT=3306
DB_USER=root
DB_PASSWORD=portes2025
DB_NAME=vuon

# JWT Secret
JWT_SECRET=your-secret-key-change-this-in-production

# Server Port
PORT=3000
```

#### Para conexão direta (sem SSH):

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=portes2025
DB_NAME=vuon

# JWT Secret
JWT_SECRET=your-secret-key-change-this-in-production

# Server Port
PORT=3000
```

**Importante:** 
- Se `USE_SSH_TUNNEL=true`, o sistema criará automaticamente um túnel SSH antes de conectar ao MySQL
- Se `USE_SSH_TUNNEL` não estiver definido ou for `false`, a conexão será direta usando `DB_HOST` e `DB_PORT`

### 3. Inicializar o Banco de Dados

Execute o script para criar as tabelas necessárias:

```bash
npm run init-db
```

Este script criará as seguintes tabelas:
- `usuarios` - Armazena os usuários do sistema
- `permissoes` - Armazena as permissões disponíveis
- `usuario_permissao` - Tabela de relacionamento entre usuários e permissões

### 4. Criar Usuário de Teste

Para criar um usuário padrão (admin/123):
```bash
npm run create-user
```

Para criar um usuário personalizado:
```bash
node scripts/createUser.js <username> <password> <nome>
```

Exemplo:
```bash
node scripts/createUser.js joao senha123 "João Silva"
```

## Executar o Servidor

### Modo Desenvolvimento (com auto-reload)
```bash
npm run dev
```

### Modo Produção
```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`

## Estrutura do Projeto

```
backend/
├── config/
│   └── db.js              # Configuração do banco de dados
├── controllers/
│   └── authController.js   # Lógica de autenticação
├── routes/
│   └── authRoutes.js       # Rotas de autenticação
├── scripts/
│   ├── initDatabase.js     # Script para inicializar o banco
│   └── createUser.js       # Script para criar usuários
└── server.js               # Servidor Express

