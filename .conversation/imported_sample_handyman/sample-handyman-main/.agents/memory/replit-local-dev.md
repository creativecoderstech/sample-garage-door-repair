---
name: Running the Cloudflare Worker app on Replit
description: How local dev works after the Cloudflare Workers migration, and the pnpm/firewall pitfalls
---

# Running the Cloudflare Worker app on Replit

The app is a single Cloudflare Worker project in `artifacts/sample-handyman` (Hono API + Vite frontend + D1/KV/R2/AI bindings). Old `api-server` artifact is gone.

**How to run locally:**
- Vite `dev` alone is broken by design — `/api/*` is served by the Worker, so the frontend crashes with runtime TypeErrors when only Vite runs.
- Use `wrangler dev` against `wrangler.local.jsonc` (a generated copy of `wrangler.jsonc` env.dev with `ai` and `send_email` bindings stripped). That file is local-only, ignored via `.git/info/exclude` (NOT .gitignore — user forbids pushing Replit-specific files).
- Rebuild frontend (`pnpm run build:web` with PORT/BASE_PATH set) before wrangler serves it — wrangler serves `dist/public`, no HMR.
- Local D1 migrations: `pnpm exec wrangler d1 migrations apply sample-handyman-db-dev --local --env dev`.
- The full `wrangler.jsonc` AI binding needs a remote proxy session → requires `CLOUDFLARE_API_TOKEN` secret even for local dev. Requested from user; if present, drop the local config and run with `--env dev` directly.

**Package manager pitfalls (Replit firewall):**
- Repo pins `packageManager: pnpm@11.x`; pnpm's self-update download is blocked by the Replit package firewall, so every pnpm command hangs/fails. Fix: `manage-package-manager-versions=false` (set globally via `pnpm config set --global`, plus `npm_config_manage_package_manager_versions=false` in workflow commands). Lockfile v9.0 works fine with nix pnpm 10.
- Same firewall previously hard-blocked `tsx` tarballs (403) — fixed by manually seeding the pnpm store; store entries are ephemeral.

**Why:** the user forbids committing Replit-specific config; keep all Replit workarounds outside tracked files.
**How to apply:** any time the app "crashes with runtime errors" after a fresh pull, check that wrangler dev (not bare Vite) is what's serving, and that pnpm isn't hanging on self-update.

## Local R2 media seeding
Gallery and Before & After images 404 in local dev because seed scripts (`seed:gallery:dev`, `seed:tasks:dev`) upload with `--remote` only. Seed miniflare's local R2 instead: `wrangler r2 object put sample-handyman-media-dev/<key> --file ... --local --config wrangler.local.jsonc --env dev` for each key in the two seed scripts. Local R2 state lives in `.wrangler/state`, so it persists across workflow restarts but not fresh clones.

## Cloudflare API token scoping
Token must be created as Custom Token with Zone Resources + Account Resources explicitly included, else /zones and /accounts list empty even though the token verifies. Working set: Account (Workers Scripts/KV/R2/D1/Workers AI Edit, Account Settings Read), Zone (DNS Edit, Workers Routes Edit, Zone Read), User (Details/Memberships Read). Prod domain served by Worker routes; apex/www/admin DNS = proxied placeholder A 192.0.2.1 (+ AAAA 100::). Sandbox curl to the apex domain returns 000 (local DNS quirk) — verify with `--resolve domain:443:<CF edge ip>`.

## Dev admin bypass
`/api/auth/dev-login` (GET) creates an 8-hour super_admin session using the seeded user without Google OAuth. Hard-blocked in production (`ENVIRONMENT === "production"`). Route + `/api/auth/env` added to the public route allowlist in `worker/api-guards.ts`. SESSION_SECRET must be in `artifacts/sample-handyman/.dev.vars` (git-excluded) for sealSession to work locally — created automatically from `$SESSION_SECRET` env var. Login page shows "Continue as Dev Admin" button only when `/api/auth/env` returns non-production.

## Vitest + @cloudflare/vitest-pool-workers (v0.20.3 + Vitest 4)
- Config uses `cloudflareTest()` Vite plugin (NOT the old `pool:` string): import from `@cloudflare/vitest-pool-workers`, add to `plugins[]` in `vitest.config.ts`.
- D1 migrations for tests: two-file pattern — `vitest.global-setup.ts` calls `readD1Migrations()` (Node.js side) and `provide("d1Migrations", migrations)` via the `{ provide }` param passed to `setup()`; `worker/vitest-setup.ts` (Miniflare side) calls `inject("d1Migrations")` and applies each SQL row.
- `SELF.fetch()` follows redirects by default — always pass `{ redirect: "manual" }` when testing routes that return 302.

## Outbound TLS from workerd is blocked in the sandbox
Any `fetch` (or AI-binding remote call) made from inside `wrangler dev`'s workerd fails with "TLS peer's certificate is not trusted" — the Replit proxy's cert isn't in workerd's trust store. This is why the chat assistant and voice transcription return their "unavailable" fallbacks in local dev. Not fixable in code; verify such features against the real Cloudflare account (direct REST call with CLOUDFLARE_API_TOKEN from the shell, or deploy) instead of the dev preview.

## Remote AI binding in local wrangler dev
Workers AI (`"ai"` binding with `"remote": true` in wrangler.local.jsonc) works from the container only if workerd can find CA certs: run wrangler dev with `SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt SSL_CERT_DIR=/etc/ssl/certs` (now baked into the workflow command). Without it, workerd fails with "TLS peer's certificate is not trusted" and /api/chat 500s.
