/**
 * PM2 ecosystem — gestión del proceso Next.js en IONOS VPS.
 *
 * Instalación en el servidor:
 *   npm install -g pm2
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup   ← genera el comando para arranque automático
 */
module.exports = {
  apps: [
    {
      name:         "prospectia-portal",
      script:       "node_modules/.bin/next",
      args:         "start",
      cwd:          "/var/www/portal",
      instances:    1,
      autorestart:  true,
      watch:        false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT:     3000,
      },
    },
  ],
};
