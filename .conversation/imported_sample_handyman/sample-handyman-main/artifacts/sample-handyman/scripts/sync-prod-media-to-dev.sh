#!/usr/bin/env bash
# Copy R2 media objects referenced by the local dev D1 database from the
# PRODUCTION bucket (sample-handyman-media-prod) into the LOCAL dev R2 state,
# so images synced from prod display correctly in the dev preview.
# Usage: pnpm run sync:prod-media-to-dev
# (Run after sync:prod-to-dev, or use sync:prod-to-dev which calls this automatically.)
set -euo pipefail
cd "$(dirname "$0")/.."

# Objects are fetched over the production site's public media route because the
# Cloudflare API token in this workspace has no R2 read permission.
PROD_MEDIA_URL="${PROD_MEDIA_URL:-https://sample-handyman.com/api/media}"
DEV_BUCKET="sample-handyman-media-dev"
TMP_DIR="$(mktemp -d /tmp/sample-handyman-media-sync.XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "==> Collecting media keys referenced by the local dev database..."
KEYS_JSON="$TMP_DIR/keys.json"
pnpm exec wrangler d1 execute DB --config wrangler.local.jsonc --env dev --local --json --command "
  SELECT image_key AS k FROM gallery_items
  UNION SELECT before_key FROM tasks
  UNION SELECT after_key FROM tasks
  UNION SELECT image_key FROM service_request_photos
  UNION SELECT value FROM site_settings WHERE key = 'hero_image_key' AND value <> '';
" > "$KEYS_JSON"

KEYS_FILE="$TMP_DIR/keys.txt"
node -e "
  const data = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
  const keys = data.flatMap((r) => r.results ?? []).map((row) => row.k).filter(Boolean);
  process.stdout.write(keys.map((k) => k + '\n').join(''));
" "$KEYS_JSON" > "$KEYS_FILE"

TOTAL=$(grep -c . "$KEYS_FILE" || true)
if [ "$TOTAL" -eq 0 ]; then
  echo "==> No media keys referenced in the dev database. Nothing to sync."
  exit 0
fi
echo "==> Found $TOTAL media key(s) to sync."

COPIED=0
FAILED=0
while IFS= read -r key; do
  [ -n "$key" ] || continue
  obj="$TMP_DIR/object.bin"
  rm -f "$obj"
  echo "--> $key"
  # URL-encode each path segment of the key (keys can contain spaces etc.)
  encoded_key=$(node -e "process.stdout.write(process.argv[1].split('/').map(encodeURIComponent).join('/'))" "$key")
  meta=$(curl -sf -o "$obj" -w "%{content_type}" "$PROD_MEDIA_URL/$encoded_key" || true)
  if [ -s "$obj" ]; then
    content_type="${meta%%;*}"
    [ -n "$content_type" ] || content_type="application/octet-stream"
    pnpm exec wrangler r2 object put "$DEV_BUCKET/$key" \
      --config wrangler.local.jsonc --env dev --local \
      --file "$obj" --content-type "$content_type" >/dev/null
    COPIED=$((COPIED + 1))
  else
    echo "    WARNING: could not fetch $key from production (missing in prod?). Skipping."
    FAILED=$((FAILED + 1))
  fi
done < "$KEYS_FILE"

echo "==> Media sync complete: $COPIED copied, $FAILED skipped."
