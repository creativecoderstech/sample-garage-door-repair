---
name: Cloudflare Dev/Prod resource separation
description: Fully isolated Dev and Prod Cloudflare resources for Sample Handyman
---

Account ID: `0d733110ca07037f32dee512c3963eae`  
workers.dev subdomain: `sample-handyman`  
Auth: repo-root `.env` `CLOUDFLARE_API_TOKEN` (never commit)

## Resource inventory (fully separated)

| Resource | Dev | Prod |
|----------|-----|------|
| Worker | `sample-handyman-home-solutions-dev` | `sample-handyman-home-solutions` |
| workers.dev URL | `https://sample-handyman-home-solutions-dev.sample-handyman.workers.dev` | `https://sample-handyman-home-solutions.sample-handyman.workers.dev` |
| D1 | `sample-handyman-db-dev` (`26e948c1-1d74-4d2c-b792-3267ef2b45c0`) | `sample-handyman-db` (`d294cf5d-b99a-4797-9851-09e95e0b9709`) |
| KV (rate limit) | `PENNY_LANE_RATE_LIMIT_DEV` (`1a9cd90863b14e0d8bf9200d88e13848`) | `PENNY_LANE_RATE_LIMIT_PROD` (`bb0f522f05694482a6347b36505f5429`) |
| R2 (media) | `sample-handyman-media-dev` → binding `MEDIA` | `sample-handyman-media-prod` → binding `MEDIA` |
| AI Gateway | `sample-handyman-dev` | `sample-handyman-prod` |
| Assets | deployed to Dev Worker only | deployed to Prod Worker only |
| Observability | Dev Worker logs/traces | Prod Worker logs/traces |
| Vars | `ENVIRONMENT=dev`, `AI_GATEWAY_ID=sample-handyman-dev` | `ENVIRONMENT=production`, `AI_GATEWAY_ID=sample-handyman-prod` |

Workers AI model inference is account-scoped, but each env routes through its own AI Gateway for logs/analytics isolation. Bindings (`AI`, `DB`, `RATE_LIMIT`, `MEDIA`, `ASSETS`) are declared separately under `env.dev` and `env.production` (non-inheritable).

Before & After task images use R2 keys `tasks/{id}/before-{uuid}.ext` / `after-...` and are served via Worker `GET /api/media/*`. Task write APIs are unauthenticated until token auth is added. R2 must be enabled once in the Cloudflare dashboard (error 10042 if not).

## Commands

- `pnpm --filter @workspace/sample-handyman run deploy:dev`
- `pnpm --filter @workspace/sample-handyman run deploy:prod`
- `pnpm --filter @workspace/sample-handyman run db:migrate:dev`
- `pnpm --filter @workspace/sample-handyman run db:migrate:prod`
- `pnpm --filter @workspace/sample-handyman run dev:cf` (local against Dev config)

Config: `artifacts/sample-handyman/wrangler.jsonc`

## Email Sending (transactional)

- Binding: `EMAIL` (`send_email`) on both env.dev and env.production
- From address must be on a domain onboarded via Email Sending (not `@gmail.com`)
- Admin Settings: `ownerEmail`, `notifyFromEmail`, `notifyFromName`, phone
- Readiness: `GET /api/settings/notify-status`
- Token needs Email Sending permission (`wrangler email sending list` fails with 2036 without it)
- As of 2026-08-03: account has no Zones; current `notifyFromEmail` is Gmail and sends fail with domain-not-found
