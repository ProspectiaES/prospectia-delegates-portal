#!/bin/bash
set -e
APP_DIR="/var/www/portal"
REPO="https://ProspectiaES:ghu_CQBiKhtLijaQPslnmfHZ9jLvf9FWNu4dHZPc@github.com/ProspectiaES/prospectia-delegates-portal.git"

echo "Actualizando portal..."
cd "$APP_DIR"

# Primera vez: inicializar git si no existe
if [ ! -d ".git" ]; then
  echo "  Inicializando repositorio git..."
  git init
  git remote add origin "$REPO"
else
  git remote set-url origin "$REPO"
fi

git fetch origin main --quiet
git reset --hard origin/main --quiet
npm install --quiet
npm run build
pm2 restart prospectia-portal

# ─── Cron: status sync every 4 hours ─────────────────────────────────────────
CRON_SECRET_VAL=$(grep '^CRON_SECRET=' "$APP_DIR/.env.production" 2>/dev/null | cut -d= -f2-)
if [ -n "$CRON_SECRET_VAL" ]; then
  CRON_LINE="0 */4 * * * APP_URL=https://dashboard.prospectia.es CRON_SECRET=$CRON_SECRET_VAL node $APP_DIR/scripts/cron-sync.mjs status >> /var/log/holded-sync.log 2>&1"
  # Remove old entry (if any) and add fresh one
  (crontab -l 2>/dev/null | grep -v "cron-sync.mjs status"; echo "$CRON_LINE") | crontab -
  echo "  ✅ Cron de sincronización configurado (cada 4h)"
fi

echo "✅ Portal actualizado"
