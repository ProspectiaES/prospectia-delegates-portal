#!/bin/bash
set -e
APP_DIR="/var/www/portal"

echo "Actualizando portal..."

# Download latest tarball from GitHub API (Bearer token works from any machine)
curl -sL \
  -H "Authorization: Bearer ${GH_TOKEN}" \
  "https://api.github.com/repos/ProspectiaES/prospectia-delegates-portal/tarball/main" \
  | tar -xz -C "$APP_DIR" --strip-components=1

cd "$APP_DIR"
npm install --quiet
npm run build
pm2 restart prospectia-portal

# ─── Cron: status sync every 4 hours ─────────────────────────────────────────
CRON_SECRET_VAL=$(grep '^CRON_SECRET=' "$APP_DIR/.env.production" 2>/dev/null | cut -d= -f2-)
if [ -n "$CRON_SECRET_VAL" ]; then
  CRON_LINE="0 */4 * * * APP_URL=https://dashboard.prospectia.es CRON_SECRET=$CRON_SECRET_VAL node $APP_DIR/scripts/cron-sync.mjs status >> /var/log/holded-sync.log 2>&1"
  (crontab -l 2>/dev/null | grep -v "cron-sync.mjs status"; echo "$CRON_LINE") | crontab -
fi

echo "✅ Portal actualizado"
