# Cloudflare Resources Schema
## Penny Lane Home Solutions — New Client Setup Reference

---

## Overview

This document covers every Cloudflare resource used by this project so you can
replicate the full infrastructure for a new client from scratch without touching
the original project.

**Two environments per client: `dev` and `production` — nothing shared between them.**

---

## Resource Summary

| Resource | Dev | Production |
|---|---|---|
| Worker | `[client]-home-solutions-dev` | `[client]-home-solutions` |
| D1 Database | `[client]-db-dev` | `[client]-db` |
| KV Namespace | `[client]-kv-dev` | `[client]-kv-prod` |
| R2 Bucket | `[client]-media-dev` | `[client]-media-prod` |
| Workers AI | account-level binding (no create needed) | same |
| Email Workers | account-level binding (enable in dashboard) | same |
| Custom Domain | not required | `yourdomain.com` |

---

## 1. Worker (Compute)

Two environments from one codebase.

| Setting | Dev | Production |
|---|---|---|
| Worker name | `[client]-home-solutions-dev` | `[client]-home-solutions` |
| Compatibility date | `2026-08-02` | `2026-08-02` |
| Compatibility flags | `nodejs_compat` | `nodejs_compat` |
| Workers.dev URL | ✅ Enabled | ✅ Enabled (fallback) |
| Custom routes | None | See Routes section below |
| Cron trigger | `0 6 * * *` (daily cleanup at 6 AM UTC) | `0 6 * * *` |
| Observability | Enabled, 100% head sampling | Enabled, 100% head sampling |

### SPA Asset Handling

The Worker serves the React SPA from a `./dist/public` directory.

| Setting | Dev | Production |
|---|---|---|
| Assets directory | `./dist/public` | `./dist/public` |
| Asset binding | `ASSETS` | `ASSETS` |
| 404 handling | `single-page-application` | `single-page-application` |
| Run worker first | `/api/*`, `/admin`, `/admin/*` | All routes (`true`) |

### Custom Routes (Production Only)

Replace `yourdomain.com` with the client's actual domain:

```
yourdomain.com
yourdomain.com/*
www.yourdomain.com
www.yourdomain.com/*
admin.yourdomain.com
admin.yourdomain.com/*
```

All routes share the same `zone_name: "yourdomain.com"`.

---

## 2. D1 Databases (SQLite — Serverless)

One database per environment. D1 is Cloudflare's serverless SQL database.

| Setting | Dev | Production |
|---|---|---|
| Database name | `[client]-db-dev` | `[client]-db` |
| Binding in Worker | `DB` | `DB` |
| Migrations dir | `./migrations` | `./migrations` |

### How to Create

```bash
# Dev database
wrangler d1 create [client]-db-dev
# → Copy the printed database_id into wrangler.jsonc under env.dev

# Production database
wrangler d1 create [client]-db
# → Copy the printed database_id into wrangler.jsonc under env.production
```

### Run Migrations After Creating

```bash
# Dev
wrangler d1 migrations apply [client]-db-dev --env dev

# Production
wrangler d1 migrations apply [client]-db --env production
```

---

## 3. KV Namespace (Rate Limiting)

Used for per-IP rate limiting on the booking, review, and voice transcription
endpoints. One namespace per environment.

| Setting | Dev | Production |
|---|---|---|
| Binding in Worker | `RATE_LIMIT` | `RATE_LIMIT` |
| Namespace name | any name (e.g. `[client]-kv-dev`) | any name (e.g. `[client]-kv-prod`) |

### How to Create

```bash
# Dev
wrangler kv namespace create RATE_LIMIT --env dev
# → Copy the printed id into wrangler.jsonc under env.dev.kv_namespaces

# Production
wrangler kv namespace create RATE_LIMIT --env production
# → Copy the printed id into wrangler.jsonc under env.production.kv_namespaces
```

---

## 4. R2 Bucket (Media Storage)

Stores gallery photos and before/after job images uploaded by the business
owner in the admin panel. The Worker proxies all reads — no public bucket URL
is needed.

| Setting | Dev | Production |
|---|---|---|
| Bucket name | `[client]-media-dev` | `[client]-media-prod` |
| Binding in Worker | `MEDIA` | `MEDIA` |
| Public access | Not required | Not required |

### How to Create

```bash
wrangler r2 bucket create [client]-media-dev
wrangler r2 bucket create [client]-media-prod
# No ID to copy — just use the bucket name directly in wrangler.jsonc
```

---

## 5. Workers AI (Voice Transcription)

No resource to create — this is an account-level service. Just add the
binding to `wrangler.jsonc` and it works.

| Setting | Value |
|---|---|
| Binding in Worker | `AI` |
| Primary model | `@cf/openai/whisper-large-v3-turbo` |
| Fallback | OpenAI whisper-1 via `OPENAI_API_KEY` secret |
| Cost | Free on most plans (usage limits apply) |

```jsonc
// In both env.dev and env.production blocks:
"ai": {
  "binding": "AI"
}
```

---

## 6. Email Workers (Booking Confirmations)

Used to send transactional emails when the owner confirms a booking.

| Setting | Value |
|---|---|
| Binding in Worker | `EMAIL` |
| Type | Cloudflare Email Workers (free tier) |
| Setup | CF Dashboard → Email → Email Workers → Enable |

```jsonc
// In both env.dev and env.production blocks:
"send_email": [
  { "name": "EMAIL" }
]
```

---

## 7. DNS Configuration (Custom Domain)

Cloudflare Worker routes intercept traffic before it reaches any server.
Use a placeholder IP — the actual value doesn't matter.

| Subdomain | Record Type | Value | Proxied |
|---|---|---|---|
| `yourdomain.com` (apex) | A | `192.0.2.1` | ✅ Yes |
| `www.yourdomain.com` | A | `192.0.2.1` | ✅ Yes |
| `admin.yourdomain.com` | A | `192.0.2.1` | ✅ Yes |
| `yourdomain.com` (apex) | AAAA | `100::` | ✅ Yes |

> The placeholder IP `192.0.2.1` is a reserved "documentation" IP (RFC 5737).
> Cloudflare intercepts all proxied traffic via Worker routes before it ever
> reaches the IP. The AAAA record covers IPv6 clients.

---

## 8. Secrets

Set these in the new Replit project (Settings → Secrets) **and** in a local
`.dev.vars` file in the project root for local development.

| Secret Key | What It's For | Reuse from original? |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Wrangler deploys | ✅ Yes (same CF account) |
| `CLOUDFLARE_API_TOKEN` | Wrangler deploys | ✅ Yes (same CF account) |
| `SESSION_SECRET` | Signs admin session cookies | ❌ Generate a new one |
| `GOOGLE_CLIENT_ID` | Google OAuth for admin login | ❌ Create new OAuth app |
| `GOOGLE_CLIENT_SECRET` | Google OAuth for admin login | ❌ Create new OAuth app |
| `OPENAI_API_KEY` | Whisper transcription fallback | ✅ Can reuse |
| `OPENAI_BASE_URL` | OpenAI endpoint | ✅ Can reuse |
| `GITHUB_PAT` | Release script pushes to GitHub | ✅ Can reuse |

### Generating a New SESSION_SECRET

```bash
# Run this in any terminal — generates a secure 64-char hex string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### New Google OAuth App

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or reuse existing)
3. APIs & Services → Credentials → Create OAuth 2.0 Client ID
4. Authorized redirect URI: `https://yourdomain.com/api/auth/callback`

---

## 9. Environment Variables in wrangler.jsonc

Plain (non-secret) config values that go directly in `wrangler.jsonc`.

| Variable | Dev | Production |
|---|---|---|
| `ENVIRONMENT` | `dev` | `production` |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | `https://api.openai.com/v1` |
| `ADMIN_ORIGIN` | *(not set)* | `https://admin.yourdomain.com` |
| `PUBLIC_ORIGIN` | *(not set)* | `https://yourdomain.com` |

---

## 10. Complete wrangler.jsonc Template

Copy this into the new project's `artifacts/[client]/wrangler.jsonc`.
Replace every `[CLIENT]` and `yourdomain.com` placeholder.

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "[CLIENT]-home-solutions",
  "main": "worker/index.ts",
  "compatibility_date": "2026-08-02",
  "compatibility_flags": ["nodejs_compat"],
  "env": {
    "dev": {
      "name": "[CLIENT]-home-solutions-dev",
      "workers_dev": true,
      "preview_urls": true,
      "vars": {
        "ENVIRONMENT": "dev",
        "OPENAI_BASE_URL": "https://api.openai.com/v1"
      },
      "triggers": {
        "crons": ["0 6 * * *"]
      },
      "observability": {
        "enabled": true,
        "head_sampling_rate": 1
      },
      "assets": {
        "directory": "./dist/public",
        "binding": "ASSETS",
        "not_found_handling": "single-page-application",
        "run_worker_first": ["/api/*", "/admin", "/admin/*"]
      },
      "send_email": [{ "name": "EMAIL" }],
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "[CLIENT]-db-dev",
          "database_id": "← paste from: wrangler d1 create [CLIENT]-db-dev",
          "migrations_dir": "./migrations"
        }
      ],
      "ai": { "binding": "AI" },
      "kv_namespaces": [
        {
          "binding": "RATE_LIMIT",
          "id": "← paste from: wrangler kv namespace create RATE_LIMIT --env dev"
        }
      ],
      "r2_buckets": [
        {
          "binding": "MEDIA",
          "bucket_name": "[CLIENT]-media-dev"
        }
      ]
    },
    "production": {
      "name": "[CLIENT]-home-solutions",
      "workers_dev": true,
      "preview_urls": false,
      "routes": [
        { "pattern": "yourdomain.com", "zone_name": "yourdomain.com" },
        { "pattern": "yourdomain.com/*", "zone_name": "yourdomain.com" },
        { "pattern": "www.yourdomain.com", "zone_name": "yourdomain.com" },
        { "pattern": "www.yourdomain.com/*", "zone_name": "yourdomain.com" },
        { "pattern": "admin.yourdomain.com", "zone_name": "yourdomain.com" },
        { "pattern": "admin.yourdomain.com/*", "zone_name": "yourdomain.com" }
      ],
      "vars": {
        "ENVIRONMENT": "production",
        "OPENAI_BASE_URL": "https://api.openai.com/v1",
        "ADMIN_ORIGIN": "https://admin.yourdomain.com",
        "PUBLIC_ORIGIN": "https://yourdomain.com"
      },
      "triggers": {
        "crons": ["0 6 * * *"]
      },
      "observability": {
        "enabled": true,
        "head_sampling_rate": 1
      },
      "assets": {
        "directory": "./dist/public",
        "binding": "ASSETS",
        "not_found_handling": "single-page-application",
        "run_worker_first": true
      },
      "send_email": [{ "name": "EMAIL" }],
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "[CLIENT]-db",
          "database_id": "← paste from: wrangler d1 create [CLIENT]-db",
          "migrations_dir": "./migrations"
        }
      ],
      "ai": { "binding": "AI" },
      "kv_namespaces": [
        {
          "binding": "RATE_LIMIT",
          "id": "← paste from: wrangler kv namespace create RATE_LIMIT --env production"
        }
      ],
      "r2_buckets": [
        {
          "binding": "MEDIA",
          "bucket_name": "[CLIENT]-media-prod"
        }
      ]
    }
  }
}
```

---

## 11. Full Setup Checklist

Run these commands in order in the new Replit project's shell.
Prefix every `wrangler` call with:
`npm_config_manage_package_manager_versions=false pnpm exec wrangler`

```bash
# Step 1 — Create D1 databases (copy each database_id printed)
wrangler d1 create [CLIENT]-db-dev
wrangler d1 create [CLIENT]-db

# Step 2 — Create KV namespaces (copy each id printed)
wrangler kv namespace create RATE_LIMIT --env dev
wrangler kv namespace create RATE_LIMIT --env production

# Step 3 — Create R2 buckets (no ID to copy)
wrangler r2 bucket create [CLIENT]-media-dev
wrangler r2 bucket create [CLIENT]-media-prod

# Step 4 — Paste all IDs into wrangler.jsonc (see template above)

# Step 5 — Run database migrations
wrangler d1 migrations apply [CLIENT]-db-dev --env dev
wrangler d1 migrations apply [CLIENT]-db --env production

# Step 6 — Configure DNS in Cloudflare dashboard
#   apex, www, admin → A record 192.0.2.1 (proxied)
#   apex → AAAA record 100:: (proxied)

# Step 7 — Add all secrets to the new Replit project

# Step 8 — Build and deploy
pnpm run build:web
wrangler deploy --env production
```

---

## 12. Cloudflare API Token Scopes

When creating the token, use **Custom Token** with these permissions:

| Category | Resource | Permission |
|---|---|---|
| Account | Workers Scripts | Edit |
| Account | Workers KV Storage | Edit |
| Account | Workers R2 Storage | Edit |
| Account | D1 | Edit |
| Account | Workers AI | Read |
| Account | Account Settings | Read |
| Zone | DNS | Edit |
| Zone | Workers Routes | Edit |
| Zone | Zone | Read |
| User | User Details | Read |
| User | Memberships | Read |

Set **Account Resources** to your specific account and **Zone Resources** to
the client's specific zone — do not use "All zones" for production tokens.

---

*Generated from Penny Lane Home Solutions — August 2026*
