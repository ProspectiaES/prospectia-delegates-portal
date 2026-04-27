#!/bin/bash
set -e
APP_DIR="/var/www/portal"
REPO="https://github.com/ProspectiaES/prospectia-delegates-portal.git"

echo "Actualizando portal..."
cd "$APP_DIR"

# Primera vez: inicializar git si no existe
if [ ! -d ".git" ]; then
  echo "  Inicializando repositorio git..."
  git init
  git remote add origin "$REPO"
fi

git fetch origin main --quiet
git reset --hard origin/main --quiet
npm install --quiet
npm run build
pm2 restart prospectia-portal
echo "✅ Portal actualizado"
