/**
 * PM2 配置文件
 * 用于管理前端和后端服务
 */

module.exports = {
  apps: [
    {
      name: 'temple-run-frontend',
      script: 'server-frontend.js',
      env: {
        NODE_ENV: 'production',
        PORT: 9000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '200M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      out_file: 'logs/frontend-out.log',
      error_file: 'logs/frontend-error.log'
    },
    {
      name: 'temple-run-backend',
      script: 'server/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 9001
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '200M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      out_file: 'logs/backend-out.log',
      error_file: 'logs/backend-error.log'
    }
  ]
};
