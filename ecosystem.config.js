module.exports = {
  apps: [
    {
      name: 'vuon-resultados-backend',
      script: './backend/server.js',
      cwd: '/home/portes/resultados_vuon/resultados_vuon',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false
    },
    {
      name: 'vuon-resultados-frontend',
      script: 'npm',
      args: 'run preview -- --port 4173 --host 0.0.0.0',
      cwd: '/home/portes/resultados_vuon/resultados_vuon/dashboard',
      env: {
        NODE_ENV: 'production',
        FRONTEND_PORT: 4173
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '200M',
      watch: false
    }
  ]
};

