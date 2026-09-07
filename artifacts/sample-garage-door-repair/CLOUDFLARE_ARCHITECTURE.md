# Cumming Garage Door Service — runtime and release contract

## Runtime boundaries

Production is the existing **Cloudflare Pages** project, not a standalone Worker.
`build:pages` builds the Vite customer/staff UI and bundles the advanced-mode
Function into `dist/public/_worker.js`. Every document is served through the
Pages `ASSETS` binding with request-time content, redirects and metadata. Missing
bindings fail explicitly; there is no fallback to an obsolete GitHub asset build.

| Binding | Purpose |
| --- | --- |
| `DB` | D1 content, settings, verification, requests, staff access, audit, rate limits and delivery outbox |
| `MEDIA` | R2 public business images and separately authorized private request attachments |
| `AI` | Workers AI for production Maya responses |
| `ASSETS` | Pages build files |

Development uses the Express/PostgreSQL adapter, Replit AI Integrations and
private App Storage. It does not share production data, staff grants or launch
approval. The artifact's static preview is not a substitute production runtime.

## Authentication and administration

Google sign-in uses the existing Clerk setup. Server verification checks the
session and Clerk's server-side verified Google identity. A Google account alone
does not authorize any staff API. Persisted roles are checked on every protected
request:

- Staff: operational requests and private request attachments.
- Admin: operational access plus content, business settings and media.
- Super admin: those capabilities plus grant/revoke access management.

The server-only `GARAGE_BOOTSTRAP_EMAIL` selects the exact approved initial owner.
The bootstrap is atomic and once per environment. Thereafter access belongs to
the immutable Clerk user ID; changing email cannot transfer or recreate ownership.
The protected initial owner cannot revoke or downgrade their own sole-owner role.
Grants, redemption, revocation and business mutations have actor-bound audit
events. Client cache clearing is supplementary; the database check enforces
revocation even with an existing Google session.

Pages requires production-compatible `CLERK_PUBLISHABLE_KEY`,
`CLERK_SECRET_KEY`, optional explicit `CLERK_ISSUER`, and the domain's OAuth
callbacks. Live Pages rejects development keys. The Replit-managed tenant was
detected, but automatic external Pages domain compatibility is not assumed.
Secrets are configured securely, never committed or copied into customer bundles.

## One approved public projection

The database contract drives public UI, navigation, service catalog, Maya and
request-time SEO. Original service copy may be reviewed editorial content without
claiming that business facts are verified. Locations, contact actions and optional
trust claims require their corresponding verification.

Owner-authorized examples remain editable and visibly unverified in settings and
contained preview context. They never route phone calls, email, webhook deliveries
or factual Maya answers. Production approval checks the real required facts and
notification route. Indexing additionally requires the exact HTTPS
`PUBLIC_SITE_ORIGIN`, `CLOUDFLARE_ENV=production`, live auth, non-test Turnstile
configuration and runtime bindings. All other hosts are noindex with an empty
sitemap. Staff/API/private resources are always excluded.

The industrial, trust, eco, modern and classic palette tokens are presentation
choices, not claims about insurance, business age, environmental credentials or
urgent availability.

## Requests, photos, notifications and Maya

Request creation has an idempotency key and durable database storage. Photos use a
short-lived request-bound upload capability, type/size/signature validation, and
staff-only retrieval. The capability is never exposed in admin list responses.
Public business photos and customer attachments have separate access rules.

An owner-configured HTTPS webhook receives notifications. Its destination is not
derived from a login or example contact. The outbox exposes unconfigured, pending,
processing, failed and delivered states. Retrying claims the existing delivery,
not a new customer request; the receiver should deduplicate using the supplied
idempotency identifier. Success is reported only after a successful HTTP response.
No receiving destination has been authorized merely by building this feature.
Failures are retained for a staff-authorized manual retry; no background scheduler
is implied. A receiver hostname must also be explicitly permitted by the server's
`NOTIFICATION_ALLOWED_HOSTS` configuration. Admin settings cannot extend that
allowlist. Allowlisted receiver hostnames and their DNS operators are an explicit
trusted boundary: this is exact hostname allowlisting, not DNS pinning. Only vet
public HTTPS receivers controlled by the chosen notification provider; do not
allow wildcard, local, reserved, IP-literal, or privately routed destinations.

Maya retains the existing temporary transcript, voice input and session-scoped
service-summary handoff. Production uses Workers AI; development uses the
configured Replit AI provider. Required provider failures are explicit. Maya does
not invent prices, availability, warranty, credentials or coverage and does not
offer dangerous high-tension repair instructions.

Production requires real `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.
Missing/invalid tokens fail, including for request submission and Maya actions.
Persistent application rate controls supplement Turnstile. Provider/domain
configuration must be checked on the final domain before approval.

## Additive migration and release procedure

No remote operations are automatic during development or merge.

1. Review the diff, licenses and [owner checklist](PRELAUNCH.md). Back up the target
   D1 database using the account's approved export process and record the
   corresponding R2 inventory. Keep backups private. Verify the exact target
   resource IDs and that they still exist; do not recreate or rebind them blindly.
2. Run the development versioned PostgreSQL migration and guarded content seed.
   The migration ledger checks version/checksum and executes each additive change
   transactionally. `scripts/post-merge.sh` does not perform a destructive schema
   push. Use isolated fixtures to verify fresh and existing-data upgrades.
3. Build and check the reviewed source:
   `PORT=22004 BASE_PATH=/ pnpm --filter @workspace/sample-garage-door-repair run build:pages`
   then `pnpm --filter @workspace/sample-garage-door-repair run verify:cloudflare-release`.
   Include all imports, generated contracts, migration files, photo rights records
   and referenced fingerprinted build assets in the release.
   `node scripts/verify-garage-staged-release.mjs` independently builds the staged
   tree in an isolated temporary folder with the frozen lockfile.
4. After explicit owner release approval, provide `D1_DATABASE_NAME` and
   `D1_DATABASE_ID` for the intended binding and run
   `pnpm --filter @workspace/sample-garage-door-repair run migrate:d1:remote --approved-release`.
   The helper constructs temporary Wrangler configuration pointing to
   `cloudflare/migrations`; it refuses a remote migration without the approval
   flag. D1's migration ledger prevents rerunning applied versions. Do not edit an
   already-applied migration, reset tables, or rerun seed INSERTs from a handler.
5. Deploy `dist/public` through the existing Pages release workflow only after
   confirming DB, MEDIA, AI, ASSETS, secrets and domain/callback configuration.
   Preview deployments must use separate resources and no launch approval.
6. On the owner-approved domain, verify Google bootstrap/grant/revoke, private
   attachment denial, a real request and notification, actual Workers AI,
   Turnstile rejection and successful valid tokens, canonical URLs and indexing.
   Observe failures before enabling marketing traffic; never declare live checks
   passed based solely on local fixtures.

For a release failure, stop promotion and use the approved backup/previous Pages
deployment procedure. Do not replace the runtime or discard production data as a
shortcut.