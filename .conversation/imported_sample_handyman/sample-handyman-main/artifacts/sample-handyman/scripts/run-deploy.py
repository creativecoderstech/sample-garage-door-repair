#!/usr/bin/env python3
"""
Reads the live CLOUDFLARE_API_TOKEN from /run/replit/env/latest.json
(bypassing the frozen shell environment) and executes the full production
deployment sequence.

Usage:  python3 scripts/run-deploy.py
"""
import json
import os
import subprocess
import sys

LIVE_JSON = "/run/replit/env/latest.json"

# ── Load live secrets ──────────────────────────────────────────────────────────
try:
    with open(LIVE_JSON) as f:
        live = json.load(f).get("environment", {})
except Exception as e:
    print(f"⚠️  Could not read {LIVE_JSON}: {e}")
    live = {}

def secret(key):
    return live.get(key) or os.environ.get(key, "")

CF_TOKEN   = secret("CLOUDFLARE_API_TOKEN")
CF_ACCOUNT = secret("CLOUDFLARE_ACCOUNT_ID")

if not CF_TOKEN:
    sys.exit("❌ CLOUDFLARE_API_TOKEN not found.")

print(f"🔑  Cloudflare token loaded (length {len(CF_TOKEN)})")

# ── Verify token has Workers access ───────────────────────────────────────────
import urllib.request, urllib.error
req = urllib.request.Request(
    f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/workers/scripts?per_page=1",
    headers={"Authorization": f"Bearer {CF_TOKEN}"},
)
try:
    urllib.request.urlopen(req)
    print("✅  Token has Workers access")
except urllib.error.HTTPError as e:
    errs = json.loads(e.read()).get("errors", [])
    sys.exit(
        f"❌ Token cannot access Workers API: {errs}\n"
        "   Please update CLOUDFLARE_API_TOKEN in the Replit Secrets panel with a token\n"
        "   created from the 'Edit Cloudflare Workers' template at:\n"
        "   https://dash.cloudflare.com/profile/api-tokens"
    )

# ── Build merged env for subprocesses ─────────────────────────────────────────
env = {**os.environ, **live, "CLOUDFLARE_API_TOKEN": CF_TOKEN, "CLOUDFLARE_ACCOUNT_ID": CF_ACCOUNT,
       "npm_config_manage_package_manager_versions": "false"}

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # sample-handyman/

def run(*args, **kwargs):
    print(f"\n▶  {' '.join(str(a) for a in args[0])}")
    result = subprocess.run(*args, env=env, cwd=root, **kwargs)
    if result.returncode != 0:
        sys.exit(f"❌ Command failed (exit {result.returncode})")
    return result

WRANGLER = ["pnpm", "exec", "wrangler"]

import re, json as _json

WRANGLER_JSONC = os.path.join(root, "wrangler.jsonc")

# Read wrangler.jsonc once up-front so all regex searches below have _src.
with open(WRANGLER_JSONC) as _f:
    _src = _f.read()

# ── 1. KV namespace (RATE_LIMIT) ──────────────────────────────────────────────
print("\n── KV Namespace ─────────────────────────────────────────────────────────")

# Wrangler names the namespace "<worker-name>-<binding>" when you run
# `wrangler kv namespace create RATE_LIMIT --env production`.
# Read the worker name from wrangler.jsonc so this is correct even after a rename.
_prod_name_m = re.search(
    r'"production"\s*:\s*\{[^}]*?"name"\s*:\s*"([^"]+)"', _src, re.DOTALL
)
PROD_WORKER_NAME = _prod_name_m.group(1) if _prod_name_m else "sample-handyman"
KV_NAMESPACE_TITLE = f"{PROD_WORKER_NAME}-RATE_LIMIT"

# Extract committed KV id (second 32-hex "id" value in the file — prod env).
_kv_ids = re.findall(r'"id"\s*:\s*"([0-9a-f]{32})"', _src)
COMMITTED_KV_ID = _kv_ids[1] if len(_kv_ids) >= 2 else ""

# List namespaces — wrangler kv namespace list outputs JSON by default.
kv_list = subprocess.run(
    WRANGLER + ["kv", "namespace", "list"],
    env=env, cwd=root, capture_output=True, text=True,
)
existing_kv_id = None
if kv_list.returncode == 0:
    try:
        for ns in _json.loads(kv_list.stdout):
            if ns.get("title") == KV_NAMESPACE_TITLE or ns.get("id") == COMMITTED_KV_ID:
                existing_kv_id = ns["id"]
                break
    except Exception:
        pass

if existing_kv_id:
    print(f"  ✅  KV namespace found: {existing_kv_id}")
else:
    # wrangler kv namespace create prints a JSON snippet containing the new id.
    kv_create = subprocess.run(
        WRANGLER + ["kv", "namespace", "create", "RATE_LIMIT", "--env", "production"],
        env=env, cwd=root, capture_output=True, text=True,
    )
    if kv_create.returncode != 0:
        sys.exit(
            f"❌ KV namespace creation failed (exit {kv_create.returncode}):\n"
            f"{kv_create.stderr.strip()}"
        )
    m = re.search(r'"id"\s*:\s*"([0-9a-f]{32})"', kv_create.stdout + kv_create.stderr)
    if not m:
        sys.exit(
            f"❌ Could not parse KV namespace ID from wrangler output.\n"
            f"stdout: {kv_create.stdout.strip()}\n"
            f"stderr: {kv_create.stderr.strip()}"
        )
    existing_kv_id = m.group(1)
    print(f"  ✅  KV namespace created: {existing_kv_id}")

# Patch wrangler.jsonc when the committed ID is wrong or missing.
if existing_kv_id and existing_kv_id != COMMITTED_KV_ID:
    if COMMITTED_KV_ID:
        patched = _src.replace(f'"id": "{COMMITTED_KV_ID}"', f'"id": "{existing_kv_id}"', 1)
    else:
        # No prior ID — insert it (shouldn't happen with the committed config).
        patched = _src
    if patched != _src:
        with open(WRANGLER_JSONC, "w") as _f:
            _f.write(patched)
        print(f"  📝  wrangler.jsonc updated: KV id → {existing_kv_id}")
        print(f"      Commit this change so future deploys use the correct id.")

# ── 2. R2 buckets ──────────────────────────────────────────────────────────────
print("\n── R2 Buckets ───────────────────────────────────────────────────────────")
for bucket in ["sample-handyman-media-prod", "sample-handyman-media-prod-tmp"]:
    r = subprocess.run(WRANGLER + ["r2", "bucket", "create", bucket],
                       env=env, cwd=root, capture_output=True, text=True)
    already = "already exists" in (r.stdout + r.stderr)
    if r.returncode == 0 or already:
        print(f"  ✅  {bucket}" + (" (already existed)" if already else ""))
    else:
        sys.exit(
            f"❌ Failed to create R2 bucket '{bucket}' (exit {r.returncode}):\n"
            f"{r.stderr.strip()}"
        )

# ── 3. Apply D1 migrations ────────────────────────────────────────────────────
print("\n── D1 Migrations ────────────────────────────────────────────────────────")
run(WRANGLER + ["d1", "migrations", "apply", "sample-handyman-db",
                "--remote", "--env", "production"])

# ── 3. Build frontend ─────────────────────────────────────────────────────────
print("\n── Frontend Build ───────────────────────────────────────────────────────")
run(["pnpm", "run", "build:web"])

# ── 4. Deploy worker ──────────────────────────────────────────────────────────
print("\n── Worker Deploy ────────────────────────────────────────────────────────")
run(WRANGLER + ["deploy", "--env", "production"])

# ── 5. Set worker secrets ─────────────────────────────────────────────────────
print("\n── Worker Secrets ───────────────────────────────────────────────────────")
secrets_to_set = {
    "SESSION_SECRET":       secret("SESSION_SECRET"),
    "GOOGLE_CLIENT_ID":     secret("GOOGLE_CLIENT_ID"),
    "GOOGLE_CLIENT_SECRET": secret("GOOGLE_CLIENT_SECRET"),
    "GOOGLE_PLACES_API_KEY": secret("GOOGLE_MAPS_EMBED_KEY"),  # same key
}
for name, value in secrets_to_set.items():
    if not value:
        print(f"  ⚠️   {name} not set — skipping")
        continue
    r = subprocess.run(
        WRANGLER + ["secret", "put", name, "--env", "production"],
        input=value, env=env, cwd=root,
        capture_output=True, text=True,
    )
    if r.returncode == 0:
        print(f"  ✅  {name}")
    else:
        print(f"  ❌  {name}: {r.stderr.strip()}")

# ── 6. Seed default media ─────────────────────────────────────────────────────
print("\n── Seeding Default Media ────────────────────────────────────────────────")
run(["node", "scripts/seed-gallery-defaults.mjs", "production"])
run(["node", "scripts/seed-tasks-defaults.mjs", "production"])

print("\n🎉  Production deployment complete!")
print("    Worker: https://sample-handyman.com")
print("    Admin:  https://admin.sample-handyman.com")
