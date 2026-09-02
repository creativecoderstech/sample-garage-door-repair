# Sample Handyman

Marketing + lead-capture website for Mike's veteran-owned handyman business (Austin, TX / Greater Austin Area), with booking requests, admin dashboard, and AI chat.

## Stack

- pnpm workspaces, Node.js 22+ (`>=22.13`; use `.nvmrc`), TypeScript
- Frontend: React + Vite + Tailwind (`artifacts/sample-handyman`)
- API: Cloudflare Worker (Hono) in the same package
- DB: Cloudflare D1
- Media: Cloudflare R2 (`MEDIA` binding) for Before & After images
- AI chat: Cloudflare Workers AI via AI Gateway

Use Node 22 for local builds and deploys (`nvm use`). Node 24 has been flaky with Vite builds on this project; pnpm 11 requires Node `>=22.13`.

If the repo lives under iCloud Desktop/Documents, Vite can hang forever on `fs.copyFile` while copying `public/` assets. `build:web` runs a short hydrate step first to force-read those files. Prefer cloning outside iCloud-synced folders when possible.

## Environments

| | Dev | Prod |
|---|---|---|
| Worker | `sample-handyman-home-solutions-dev` | `sample-handyman-home-solutions` |
| Marketing | https://sample-handyman-home-solutions-dev.pennylane-home.workers.dev | https://sample-handyman.com |
| Admin | path `/admin` on the Dev URL | https://admin.sample-handyman.com |
| D1 | `sample-handyman-db-dev` | `sample-handyman-db` |
| KV | `PENNY_LANE_RATE_LIMIT_DEV` | `PENNY_LANE_RATE_LIMIT_PROD` |
| R2 | `sample-handyman-media-dev` | `sample-handyman-media-prod` |
| AI Gateway | `sample-handyman-dev` | `sample-handyman-prod` |

## Commands

Requires repo-root `.env` with `CLOUDFLARE_API_TOKEN`. Vite builds also need `PORT` and `BASE_PATH` (deploy scripts set these).

```bash
nvm use   # Node 22 from .nvmrc
pnpm install

# Local frontend only
PORT=25965 BASE_PATH=/ pnpm --filter @workspace/sample-handyman run dev

# Local Worker + assets (Dev bindings)
PORT=25965 BASE_PATH=/ pnpm --filter @workspace/sample-handyman run dev:cf

# Deploy
pnpm --filter @workspace/sample-handyman run deploy:dev
pnpm --filter @workspace/sample-handyman run deploy:prod

# D1 migrations
pnpm --filter @workspace/sample-handyman run db:migrate:dev
pnpm --filter @workspace/sample-handyman run db:migrate:prod
```

## Admin

Production admin dashboard: [https://admin.sample-handyman.com/](https://admin.sample-handyman.com/)

Protected with **Google Sign-In**. Users live in D1 with roles:

| Role | Dashboard | Phone / owner email | User management |
|---|---|---|---|
| Super Admin | Full | Full | Invite / edit / delete Admins & Members |
| Admin | Full | Full | No |
| Member | Full content | Read-only | No |

Seeded Super Admin (immutable): `creativecoderstech@gmail.com`

Panels: **Service Requests**, **Bookings**, **Chat Inquiries**, **Before & After Tasks**, **Gallery**, **Settings**, and **Users** (Super Admin only).

- Marketing: `sample-handyman.com` (www redirects to apex)
- Admin: `admin.sample-handyman.com`
- Local + Dev workers.dev still use path-based `/admin` for convenience

### Google OAuth setup

1. In [Google Cloud Console](https://console.cloud.google.com/) create an OAuth **Web** client.
2. Authorized redirect URIs:
   - `https://admin.sample-handyman.com/api/auth/callback`
   - Local (optional): `http://localhost:8787/api/auth/callback` (or your `wrangler dev` URL)
3. Set Worker secrets (prod example):

```bash
cd artifacts/sample-handyman
pnpm exec wrangler secret put GOOGLE_CLIENT_ID --env production
pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET --env production
# random 32+ byte string:
openssl rand -base64 48 | pnpm exec wrangler secret put SESSION_SECRET --env production
```

Repeat with `--env dev` for the Dev Worker.

4. Apply the users migration:

```bash
pnpm --filter @workspace/sample-handyman run db:migrate:prod
pnpm --filter @workspace/sample-handyman run db:migrate:dev
```

## Email notifications (email-only)

Transactional email uses Cloudflare Email Sending (`EMAIL` binding). SMS/Twilio is deferred.

| Event | Recipient |
|---|---|
| New service request | Owner email (Admin → Settings) |
| Booking confirmed | Client email (required on the public form) |

### Setup

1. Add a domain you control to this Cloudflare account (Zones), then onboard Email Sending.
   The API token needs **Email Sending** permission (wrangler error `Unauthorized [code: 2036]` means it does not).

```bash
cd artifacts/sample-handyman
pnpm exec wrangler email sending enable yourdomain.com
pnpm exec wrangler email sending dns get yourdomain.com
```

Add the SPF/DKIM records Cloudflare returns, then wait for DNS.

**From address must be on that domain.** Addresses like `@gmail.com` / `@yahoo.com` are rejected (`email from … not allowed because domain was not found`). Use e.g. `bookings@yourdomain.com`. Owner/client *recipients* can still be Gmail.

2. In **Admin → Settings**, save:
   - **Owner email** — receives new request alerts (any inbox)
   - **From email** — `…@yourdomain.com` from step 1
   - **From name** — e.g. Sample Handyman
   - **Phone** — shown on the site and in confirmation email copy

3. Check the readiness panel (owner email / from email / EMAIL binding). Ready ≠ domain verified — if sends fail, finish step 1.

4. Smoke test: submit a service request with a real client email → owner inbox; confirm in Admin → client inbox.

If confirm shows an email warning, the booking still saves — fix the from-domain and retry.

Homepage previews a small set of photos; full collections use paginated browse pages:

- `/gallery` — Gallery with Load more
- `/before-after` — Before & After with Load more

Default Gallery and Before & After photos are seeded into D1 + R2:

```bash
pnpm --filter @workspace/sample-handyman run seed:gallery:dev
pnpm --filter @workspace/sample-handyman run seed:gallery:prod
pnpm --filter @workspace/sample-handyman run seed:tasks:dev
pnpm --filter @workspace/sample-handyman run seed:tasks:prod
```

Tasks store metadata in D1 and images in R2. Public home section loads published tasks from `GET /api/tasks`. Images are served by `GET /api/media/...`.

**Security note:** Task create/update/delete APIs are intentionally unauthenticated in this pass. Add token/password auth before sharing the admin URL widely.

JPEG / PNG / WebP up to ~5MB per image. Use numeric sort order in the form to control display order.

## Git & Release Workflow

### Branch policy

| Branch | Purpose |
|--------|---------|
| `develop` | All active development — agents and contributors always commit here |
| `main` | Production-ready code only — never commit directly; always merge from `develop` via release |

### Shipping a release

From the `develop` branch with a clean working tree, run:

```bash
pnpm release patch   # 1.0.0 → 1.0.1  (bug fixes)
pnpm release minor   # 1.0.0 → 1.1.0  (new features)
pnpm release major   # 1.0.0 → 2.0.0  (breaking changes)
```

The script (`scripts/release.ts`) will:

1. Verify you are on `develop` with no uncommitted changes
2. Bump the version in every workspace `package.json` (lockstep)
3. Commit `chore: release vX.Y.Z` on `develop`
4. Push `develop` to GitHub
5. Fast-forward merge `develop → main`
6. Create an annotated git tag `vX.Y.Z`
7. Push `main` + the tag to GitHub
8. Switch back to `develop`

### Version tags

Every release gets a semantic version tag (`v1.0.0`, `v1.0.1` …) on `main`. These tags let Cloudflare and the team trace exactly what is deployed at any time.

### Rules

- **Always commit to `develop`.** Never commit application changes directly to `main`.
- **`main` is always what is live.** Cloudflare deploy hooks watch `main`.
- Use `pnpm release patch | minor | major` — that is the only path to update `main`.

## Layout

- Site + Worker: `artifacts/sample-handyman`
- API contract: `lib/api-spec/openapi.yaml` (run codegen after edits: `pnpm --filter @workspace/api-spec run codegen`)
- Generated client/Zod: `lib/api-client-react`, `lib/api-zod`
- Images: `attached_assets/` (`@assets` Vite alias)
- D1 migrations: `artifacts/sample-handyman/migrations/`


## CreativeCoders provisioning

<!-- creativecoders-provisioning:begin -->
```json
{
  "schemaVersion": 1,
  "runtime": "worker",
  "appDirectory": "artifacts/sample-handyman",
  "healthPath": "/",
  "resources": { "d1": true, "kv": true, "r2": true, "ai": true, "email": true },
  "commands": {
    "build": "pnpm --filter @workspace/sample-handyman run build:web",
    "deploy": "wrangler deploy --config wrangler.client.json",
    "migrations": { "directory": "migrations" }
  },
  "worker": {
    "package": "@workspace/sample-handyman",
    "entry": "worker/index.ts",
    "assetsDirectory": "dist/public",
    "assetsBinding": "ASSETS",
    "runWorkerFirst": true,
    "compatibilityDate": "2024-09-23",
    "bindings": { "d1": "DB", "kv": "RATE_LIMIT", "r2": "MEDIA", "ai": "AI", "email": "EMAIL" },
    "vars": { "PUBLIC_ORIGIN": "https://${DOMAIN}", "ADMIN_ORIGIN": "https://${DOMAIN}" }
  }
}
```
<!-- creativecoders-provisioning:end -->
