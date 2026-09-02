#!/usr/bin/env bash
# Pull the PRODUCTION D1 database down into the LOCAL dev database.
# Usage: pnpm run sync:prod-to-dev
# This OVERWRITES all local dev data with a fresh copy of production.
set -euo pipefail
cd "$(dirname "$0")/.."

EXPORT_FILE="/tmp/sample-handyman-prod-export.sql"

echo "==> Exporting production D1 (sample-handyman-db)..."
pnpm exec wrangler d1 export sample-handyman-db --remote --env production --output "$EXPORT_FILE"

echo "==> Wiping local dev D1 state..."
rm -rf .wrangler/state/v3/d1

echo "==> Importing production data into local dev D1..."
pnpm exec wrangler d1 execute DB --config wrangler.local.jsonc --env dev --local --file "$EXPORT_FILE"

echo "==> Syncing production media into local dev R2..."
bash ./scripts/sync-prod-media-to-dev.sh

echo "==> Done. Restart the dev server to pick up the new data."
