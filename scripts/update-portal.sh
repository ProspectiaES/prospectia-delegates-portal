#!/bin/bash
set -e
echo "Actualizando portal..."
cd /var/www/portal
curl -sL \
  -H "Authorization: token ghu_cRFwJb2QlofZ0NQ9pYrD0OoQK0DWsF0R2NHG" \
  "https://api.github.com/repos/ProspectiaES/prospectia-delegates-portal/tarball/main" \
  | tar -xz --strip-components=1 --exclude='.env*' --exclude='node_modules'
npm install --quiet
npm run build
pm2 restart prospectia-portal
echo "✅ Portal actualizado"
