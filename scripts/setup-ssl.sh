#!/bin/bash
# Aplica dominio + HTTPS en un servidor ya desplegado.
# Prerequisito: DNS dashboard.prospectia.es → 212.227.41.73 ya propagado.
set -e

DOMAIN="dashboard.prospectia.es"
EMAIL="lvila@prospectia.es"

echo "======================================"
echo "  DOMINIO + SSL — $DOMAIN"
echo "======================================"

echo "[1/4] Instalando certbot..."
apt-get update -qq
apt-get install -y -qq certbot python3-certbot-nginx

echo "[2/4] Obteniendo certificado Let's Encrypt..."
certbot certonly --nginx --non-interactive --agree-tos --email "$EMAIL" -d "$DOMAIN"

echo "[3/4] Actualizando Nginx..."
cat > /etc/nginx/sites-available/portal << NGINX
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    access_log /var/log/nginx/portal.access.log;
    error_log  /var/log/nginx/portal.error.log;
    client_max_body_size 10M;
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        'upgrade';
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout    60s;
        proxy_connect_timeout 60s;
    }
}
NGINX

nginx -t && systemctl reload nginx

echo "[4/4] Actualizando APP_URL en .env.production..."
sed -i "s|APP_URL=.*|APP_URL=https://$DOMAIN|" /var/www/portal/.env.production

# Actualizar cron con nueva URL
( crontab -l 2>/dev/null \
  | sed "s|APP_URL=.*|APP_URL=https://$DOMAIN|" \
) | crontab -

echo ""
echo "======================================"
echo "  LISTO"
echo "======================================"
echo "  Portal: https://$DOMAIN"
echo "  SSL:    Let's Encrypt (auto-renueva)"
echo "======================================"
