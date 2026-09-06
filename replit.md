# Sample Garage Door Repair

A customer-facing garage door repair website and operations admin with booking, dispatch, configurable themes and photography, and an AI safety assistant.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Admin access is temporarily open with no login. Restore server-side authorization before exposing real customer or business data.
- Public business claims fail closed. `PUBLIC_BUSINESS_VERIFIED=true` takes effect only when `PUBLIC_BUSINESS_NAME`, `PUBLIC_BUSINESS_PHONE`, `PUBLIC_BUSINESS_EMAIL`, and `PUBLIC_SERVICE_AREA` are all set. Optional verified trust fields use `PUBLIC_BUSINESS_HOURS`, `PUBLIC_OWNER_TEAM`, `PUBLIC_YEARS_IN_BUSINESS`, `PUBLIC_BRANDS_SERVICED`, `PUBLIC_PAYMENT_OPTIONS`, `PUBLIC_FINANCING_DETAILS`, `PUBLIC_LICENSE_INSURANCE`, and `PUBLIC_WARRANTY_DETAILS`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Web app: `artifacts/sample-garage-door-repair`
- API routes: `artifacts/api-server/src/routes/garage.ts`
- API contract: `lib/api-spec/openapi.yaml`
- Database schema: `lib/db/src/schema/garage.ts`
- Cloudflare production blueprint: `artifacts/sample-garage-door-repair/CLOUDFLARE_ARCHITECTURE.md`

## Deployment preference

- When the user says “deploy,” first commit and push the code to GitHub, then deploy the GitHub-backed project to Cloudflare Pages with its advanced-mode Pages Function using the documented Cloudflare production architecture.
- Treat this GitHub-to-Cloudflare Pages flow as the default production deployment target; keep the standalone Worker only as a rollback path and do not use Replit Deployments unless the user explicitly requests another platform.

## Architecture decisions

- Customer site and admin share one responsive app so Creative Coders can embed a single service sample.
- The garage-door public site uses Cooper Family Garage Doors only as inspiration for local-service hierarchy and multi-page navigation. Do not copy its identity, photographs, prose, credentials, offers, reviews, or contact information. Preserve the existing booking form, Maya chat behavior, and five-theme system when changing the public design.
- Media is admin-configurable through hosted image URLs now; R2 is the Cloudflare production upload target.
- The AI assistant is constrained to safe intake guidance and must never coach customers through high-tension repairs.
- API contracts remain provider-neutral so the Express preview adapter can be moved to Pages Functions + D1 without redesigning the frontend.
- Express/PostgreSQL and the Cloudflare Pages Function/D1 share persistent content and settings. Authentication remains disabled for the local development demo only: keep a prominent warning and never use real customer data. Production staff APIs must remain disabled until real staff authorization is configured; keep every page non-indexed until access is secured.
- Public CMS content comes from the API, not browser-local demo stores. Reviewed seed education is not evidence of verified business facts; owner edits require explicit acknowledgement before becoming public. Content/bootstrap migrations must not recreate records an owner deleted.

## Product

- Service catalog, ZIP response-time check, online booking, reviews, project gallery, emergency messaging, and AI issue triage.
- Admin dispatch dashboard, lead status management, business settings, five authentic theme presets, service ID, and photo controls.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
