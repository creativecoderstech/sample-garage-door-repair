#!/bin/bash
# Post-merge setup: runs automatically after every task merge.
# Must be idempotent, non-interactive, and fast.
set -e

export npm_config_manage_package_manager_versions=false

echo "==> Writing .dev.vars..."
# Only write vars that are actually set — writing empty values would override
# the fixture values in wrangler.test.jsonc and break the auth test suite.
{
  [ -n "${SESSION_SECRET}" ]        && echo "SESSION_SECRET=${SESSION_SECRET}"
  [ -n "${GOOGLE_CLIENT_ID}" ]      && echo "GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}"
  [ -n "${GOOGLE_CLIENT_SECRET}" ]  && echo "GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}"
} > artifacts/sample-handyman/.dev.vars

echo "==> Installing dependencies..."
pnpm install --no-frozen-lockfile

echo "==> Building frontend..."
cd artifacts/sample-handyman
pnpm run build:web

echo "==> Applying local D1 migrations..."
pnpm exec wrangler d1 migrations apply sample-handyman-db-dev \
  --local --env dev \
  --config wrangler.local.jsonc \
  2>&1 | grep -v "^\[wrangler\]" || true

echo "==> Running auth tests..."
pnpm test

echo "==> Post-merge setup complete."
