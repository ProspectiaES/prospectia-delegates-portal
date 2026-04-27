#!/bin/bash
set -e

echo "======================================"
echo "  PROSPECTIA PORTAL — SETUP SERVIDOR"
echo "======================================"

echo "[1/8] Actualizando sistema..."
apt-get update -qq && apt-get upgrade -y -qq

echo "[2/8] Instalando dependencias base..."
apt-get install -y -qq git curl nginx ufw fail2ban

echo "[3/8] Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt-get install -y -qq nodejs
echo "       Node: $(node --version)"

echo "[4/8] Instalando PM2..."
npm install -g pm2 --quiet

echo "[5/8] Descargando código desde GitHub..."
rm -rf /var/www/portal
mkdir -p /var/www/portal
curl -sL   -H "Authorization: token ghu_cRFwJb2QlofZ0NQ9pYrD0OoQK0DWsF0R2NHG"   "https://api.github.com/repos/ProspectiaES/prospectia-delegates-portal/tarball/main"   | tar -xz -C /var/www/portal --strip-components=1
echo "       OK"

echo "[6/8] Configurando variables de entorno..."
cat > /var/www/portal/.env.production << 'ENV'
NEXT_PUBLIC_SUPABASE_URL=https://amqulpbjsoydboryyrwf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtcXVscGJqc295ZGJvcnl5cndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjc5NzgsImV4cCI6MjA5MjYwMzk3OH0.b5eyjPCmPxqKYtC2Iu6lOmNErnGaGiZfu_QO1Ktig0U
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtcXVscGJqc295ZGJvcnl5cndmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzAyNzk3OCwiZXhwIjoyMDkyNjAzOTc4fQ.bICMTtEEyaNpYS6GaZEx5htUGU4tdv6_SzC7r-_5EMk
HOLDED_API_KEY=c80e4b283df7454e974b1d5375053b1c
CRON_SECRET=d505b98906610e3d93a14a5fb30329281478d036e9a0f72926705379c77ec9ff
APP_URL=https://dashboard.prospectia.es
ENV
chmod 600 /var/www/portal/.env.production

echo "[7/8] Instalando deps y construyendo app..."
cd /var/www/portal
npm install --quiet
npm run build

echo "[8/8] Iniciando con PM2..."
pm2 delete portal 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root | grep "sudo\|^[^#]" | tail -1 | bash || true

echo "[NGINX] Configurando..."
cat > /etc/nginx/sites-available/portal << 'NGINX'
server {
    listen 80;
    server_name dashboard.prospectia.es;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl http2;
    server_name dashboard.prospectia.es;
    ssl_certificate     /etc/letsencrypt/live/dashboard.prospectia.es/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.prospectia.es/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    access_log /var/log/nginx/portal.access.log;
    error_log  /var/log/nginx/portal.error.log;
    client_max_body_size 10M;
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        'upgrade';
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout    60s;
        proxy_connect_timeout 60s;
    }
}
NGINX
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/portal /etc/nginx/sites-enabled/portal

echo "[SSL] Instalando certbot y obteniendo certificado..."
apt-get install -y -qq certbot python3-certbot-nginx
certbot certonly --nginx --non-interactive --agree-tos --email lvila@prospectia.es \
  -d dashboard.prospectia.es
nginx -t && systemctl restart nginx && systemctl enable nginx

echo "[UFW] Firewall..."
ufw allow 22/tcp > /dev/null
ufw allow 80/tcp > /dev/null
ufw allow 443/tcp > /dev/null
ufw --force enable > /dev/null

echo "[CRON] Sync Holded..."
( crontab -l 2>/dev/null | grep -v "cron-sync" ; echo 'CRON_SECRET=d505b98906610e3d93a14a5fb30329281478d036e9a0f72926705379c77ec9ff' ; echo 'APP_URL=https://dashboard.prospectia.es' ; echo '*/15 * * * * node /var/www/portal/scripts/cron-sync.mjs full >> /var/log/holded-sync.log 2>&1' ; echo '0 */4 * * * node /var/www/portal/scripts/cron-sync.mjs status >> /var/log/holded-sync.log 2>&1' ) | crontab -
touch /var/log/holded-sync.log

sleep 3
echo ""
echo "======================================"
echo "  RESULTADO"
echo "======================================"
pm2 status
systemctl is-active nginx && echo "Nginx: activo"
curl -s -o /dev/null -w "App responde: HTTP %{http_code}\n" http://localhost:3000
echo ""
echo "  Portal: https://dashboard.prospectia.es"
echo "  Login:  lvila@prospectia.es"
echo "======================================"
