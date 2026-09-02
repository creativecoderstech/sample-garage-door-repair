#!/usr/bin/env bash
# Deploy Sample Handyman to Cloudflare production.
# Run from the artifacts/sample-handyman directory:
#   bash scripts/deploy-prod.sh
#
# Reads CLOUDFLARE_API_TOKEN live from /run/replit/env/latest.json so it picks
# up a freshly-saved Replit secret without needing a shell restart.

set -euo pipefail
cd "$(dirname "$0")/.."

LIVE_JSON=/run/replit/env/latest.json

# ── 1. Load fresh Cloudflare credentials ──────────────────────────────────────
CF_TOKEN=""
CF_ACCOUNT=""
if [[ -f "$LIVE_JSON" ]]; then
  CF_TOKEN=$(python3 -c "import json; d=json.load(open('$LIVE_JSON')); print(d.get('environment',{}).get('CLOUDFLARE_API_TOKEN',''))" 2>/dev/null || true)
  CF_ACCOUNT=$(python3 -c "import json; d=json.load(open('$LIVE_JSON')); print(d.get('environment',{}).get('CLOUDFLARE_ACCOUNT_ID',''))" 2>/dev/null || true)
fi
CF_TOKEN="${CF_TOKEN:-${CLOUDFLARE_API_TOKEN:-}}"
CF_ACCOUNT="${CF_ACCOUNT:-${CLOUDFLARE_ACCOUNT_ID:-}}"

if [[ -z "$CF_TOKEN" ]]; then
  echo "❌ CLOUDFLARE_API_TOKEN is not set."
  exit 1
fi
echo "🔑 Cloudflare token loaded (length ${#CF_TOKEN})"
export CLOUDFLARE_API_TOKEN="$CF_TOKEN"
export CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT"
export npm_config_manage_package_manager_versions=false

# ── 2. Verify token has Workers:Edit ──────────────────────────────────────────
echo ""
echo "▶ Checking token permissions…"
WORKERS_OK=$(curl -s \
  "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT/workers/scripts?per_page=1" \
  -H "Authorization: Bearer $CF_TOKEN" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null || echo "False")

if [[ "$WORKERS_OK" != "True" ]]; then
  echo "❌ Token cannot access the Workers API."
  echo "   Create a new token using the 'Edit Cloudflare Workers' template at:"
  echo "   https://dash.cloudflare.com/profile/api-tokens"
  exit 1
fi
echo "✅ Token OK"

# ── 3. KV namespace (RATE_LIMIT) — idempotent ────────────────────────────────
echo ""
echo "▶ Provisioning KV namespace…"

# Read the production worker name from wrangler.jsonc so the title is correct
# even after a rename (wrangler prefixes the worker name to the binding name).
PROD_WORKER_NAME=$(python3 -c "
import re, sys
src = open('wrangler.jsonc').read()
m = re.search(r'\"production\"\s*:\s*\{.*?\"name\"\s*:\s*\"([^\"]+)\"', src, re.DOTALL)
print(m.group(1) if m else 'sample-handyman')
" 2>/dev/null || echo "sample-handyman")
KV_TITLE="${PROD_WORKER_NAME}-RATE_LIMIT"

# Read the ID currently committed in wrangler.jsonc (last 32-hex "id" value).
COMMITTED_KV_ID=$(python3 -c "
import re
ids = re.findall(r'\"id\"\s*:\s*\"([0-9a-f]{32})\"', open('wrangler.jsonc').read())
print(ids[-1] if ids else '')
" 2>/dev/null || echo "")

# Look for an existing namespace by title or committed ID.
# wrangler kv namespace list outputs JSON by default (no --json flag needed).
EXISTING_KV_ID=$(pnpm exec wrangler kv namespace list 2>/dev/null \
  | python3 -c "
import sys, json
ns = json.load(sys.stdin)
match = next((x for x in ns if x.get('title') == '$KV_TITLE' or x.get('id') == '$COMMITTED_KV_ID'), None)
print(match['id'] if match else '')
" 2>/dev/null || echo "")

if [[ -n "$EXISTING_KV_ID" ]]; then
  echo "  ✅ KV namespace found: $EXISTING_KV_ID"
else
  # wrangler kv namespace create outputs a JSON snippet with the new id.
  KV_CREATE_OUT=$(pnpm exec wrangler kv namespace create RATE_LIMIT --env production 2>&1)
  KV_CREATE_RC=$?
  if [[ $KV_CREATE_RC -ne 0 ]]; then
    echo "❌ KV namespace creation failed:"
    echo "$KV_CREATE_OUT"
    exit 1
  fi
  EXISTING_KV_ID=$(echo "$KV_CREATE_OUT" | python3 -c "
import sys, re
m = re.search(r'\"id\"\s*:\s*\"([0-9a-f]{32})\"', sys.stdin.read())
print(m.group(1) if m else '')
" 2>/dev/null || echo "")
  if [[ -z "$EXISTING_KV_ID" ]]; then
    echo "❌ Could not parse KV namespace ID from output:"
    echo "$KV_CREATE_OUT"
    exit 1
  fi
  echo "  ✅ KV namespace created: $EXISTING_KV_ID"
fi

# Patch wrangler.jsonc when the live ID differs from what's committed.
if [[ -n "$EXISTING_KV_ID" && "$EXISTING_KV_ID" != "$COMMITTED_KV_ID" ]]; then
  python3 -c "
import re
src = open('wrangler.jsonc').read()
patched = src.replace('\"id\": \"$COMMITTED_KV_ID\"', '\"id\": \"$EXISTING_KV_ID\"', 1)
open('wrangler.jsonc', 'w').write(patched)
print('  📝  wrangler.jsonc updated: KV id → $EXISTING_KV_ID')
print('      Commit this file so future deploys use the correct id.')
"
fi

# ── 4. R2 buckets — idempotent ───────────────────────────────────────────────
echo ""
echo "▶ Creating R2 buckets…"
for BUCKET in sample-handyman-media-prod sample-handyman-media-prod-tmp; do
  BUCKET_OUT=$(pnpm exec wrangler r2 bucket create "$BUCKET" 2>&1) || BUCKET_RC=$?
  BUCKET_RC=${BUCKET_RC:-0}
  if echo "$BUCKET_OUT" | grep -qi "already exists"; then
    echo "  ✅ $BUCKET (already existed)"
  elif [[ $BUCKET_RC -eq 0 ]]; then
    echo "  ✅ $BUCKET"
  else
    echo "❌ Failed to create R2 bucket '$BUCKET':"
    echo "$BUCKET_OUT"
    exit 1
  fi
done

# ── 5. D1 migrations ──────────────────────────────────────────────────────────
echo ""
echo "▶ Applying D1 migrations…"
pnpm exec wrangler d1 migrations apply sample-handyman-db --remote --env production
echo "✅ Migrations applied"

# ── 6. Frontend build ─────────────────────────────────────────────────────────
echo ""
echo "▶ Building frontend…"
pnpm run build:web
echo "✅ Frontend built"

# ── 7. Deploy worker ──────────────────────────────────────────────────────────
echo ""
echo "▶ Deploying worker…"
pnpm exec wrangler deploy --env production
echo "✅ Worker deployed"

# ── 8. Worker secrets ─────────────────────────────────────────────────────────
echo ""
echo "▶ Setting worker secrets…"
_set_secret() {
  local name="$1" val="$2"
  if [[ -z "$val" ]]; then
    echo "  ⚠️  $name not in Replit Secrets — skipping"
    return
  fi
  printf '%s' "$val" | pnpm exec wrangler secret put "$name" --env production
  echo "  ✅ $name"
}

SESSION_SECRET=$(python3 -c "import json; d=json.load(open('$LIVE_JSON')); print(d.get('environment',{}).get('SESSION_SECRET',''))" 2>/dev/null || true)
MAPS_KEY=$(python3 -c "import json; d=json.load(open('$LIVE_JSON')); print(d.get('environment',{}).get('GOOGLE_MAPS_EMBED_KEY',''))" 2>/dev/null || true)
GCI=$(python3 -c "import json; d=json.load(open('$LIVE_JSON')); print(d.get('environment',{}).get('GOOGLE_CLIENT_ID',''))" 2>/dev/null || true)
GCS=$(python3 -c "import json; d=json.load(open('$LIVE_JSON')); print(d.get('environment',{}).get('GOOGLE_CLIENT_SECRET',''))" 2>/dev/null || true)

_set_secret "SESSION_SECRET" "$SESSION_SECRET"
_set_secret "GOOGLE_PLACES_API_KEY" "$MAPS_KEY"
_set_secret "GOOGLE_CLIENT_ID" "$GCI"
_set_secret "GOOGLE_CLIENT_SECRET" "$GCS"

# ── 9. Seed default media ─────────────────────────────────────────────────────
echo ""
echo "▶ Seeding gallery defaults…"
node scripts/seed-gallery-defaults.mjs production
echo "✅ Gallery defaults seeded"

echo ""
echo "▶ Seeding task defaults…"
node scripts/seed-tasks-defaults.mjs production
echo "✅ Task defaults seeded"

echo ""
echo "🎉 Production deployment complete!"
echo "   Worker: https://sample-handyman.com"
echo "   Admin:  https://admin.sample-handyman.com"
