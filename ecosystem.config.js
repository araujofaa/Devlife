module.exports = {
  apps: [
    {
      name: 'devlife-api',
      cwd: './apps/api',
      script: 'pnpm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3334 // <-- Porta descoberta
      },
      error_file: './logs/devlife-api-error.log',
      out_file: './logs/devlife-api-out.log',
      merge_logs: true,
      time: true
    },
    {
      name: 'devlife-web',
      cwd: './apps/web',
      script: 'pnpm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001 // <-- Porta descoberta
      },
      error_file: './logs/devlife-web-error.log',
      out_file: './logs/devlife-web-out.log',
      merge_logs: true,
      time: true
    }
  ]
};