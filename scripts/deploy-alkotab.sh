#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/var/www/alkotab}"
PNPM_VERSION="${PNPM_VERSION:-10.6.5}"

echo "[deploy] path: $DEPLOY_PATH"

cd "$DEPLOY_PATH"

mkdir -p /var/log/pm2

corepack enable
corepack prepare "pnpm@$PNPM_VERSION" --activate

echo "[deploy] Installing API dependencies"
cd "$DEPLOY_PATH/api"
pnpm install --prod --no-frozen-lockfile

echo "[deploy] Installing web dependencies"
cd "$DEPLOY_PATH/web"
pnpm install --frozen-lockfile

echo "[deploy] Building web app"
pnpm build

echo "[deploy] Restarting PM2 apps"
cd "$DEPLOY_PATH"

if pm2 describe alkotab-api >/dev/null 2>&1 || pm2 describe alkotab-web >/dev/null 2>&1; then
  pm2 reload ecosystem.alkotab.config.js --update-env
else
  pm2 start ecosystem.alkotab.config.js --update-env
fi

pm2 save
pm2 status

echo "[deploy] Done"
