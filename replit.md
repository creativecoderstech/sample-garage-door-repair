# Cumming Garage Door Service

A customer-facing garage door repair website and operations admin with booking, dispatch, configurable themes and photography, and an AI safety assistant.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Staff administration requires server-verified Google authentication and a persisted role. No development authorization bypass is permitted. Only the configured initial owner can atomically bootstrap super-admin; later access binds to immutable identity IDs.
- Public facts are database-backed and individually verified. Owner-authorized temporary examples remain editable, but never enable contact actions, notifications, Maya facts or production launch approval. See `artifacts/sample-garage-door-repair/PRELAUNCH.md`.

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

- Customer site and admin share one responsive app; staff code is loaded separately from the first customer page.
- The garage-door public site uses Cooper Family Garage Doors only as inspiration for local-service hierarchy and multi-page navigation. Do not copy its identity, photographs, prose, credentials, offers, reviews, or contact information. Preserve the existing booking form, Maya chat behavior, and five-theme system when changing the public design.
- Media is admin-configurable through hosted image URLs now; R2 is the Cloudflare production upload target.
- The AI assistant is constrained to safe intake guidance and must never coach customers through high-tension repairs.
- API contracts remain provider-neutral so the Express preview adapter can be moved to Pages Functions + D1 without redesigning the frontend.
- Express/PostgreSQL and the Cloudflare Pages Function/D1 implement the same contracts with separate environment data and approvals. Google accounts without a persistent staff grant cannot read private data or mutate content. Roles are checked on every protected request, including after revocation.
- Public CMS content comes from the API, not browser-local stores. Original commercial service copy is not evidence of hours, coverage, credentials or completed projects. Owner edits require explicit acknowledgement before publication. Versioned migrations must preserve owner edits, deletions and verification decisions.
- Public production indexing requires approved real business facts, tested notification delivery, the chosen canonical hostname and valid runtime/auth/security bindings. A technically finished preview is not an approved public launch.

## Product

- Seven-service commercial catalog, address coverage requests, customer intake with private attachments, door-style inspiration and safety-first Maya assistance. Requests are not confirmed appointments; reviews and optional claims appear only when supported.
- Admin dispatch dashboard, lead status management, business settings, five authentic theme presets, service ID, and photo controls.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
