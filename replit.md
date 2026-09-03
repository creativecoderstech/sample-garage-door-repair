# Sample Garage Door Repair

A customer-facing garage door repair website and operations admin with booking, dispatch, configurable themes and photography, and an AI safety assistant.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Staff authorization fails closed. Provision the initial owner explicitly with `pnpm --filter @workspace/api-server provision:garage-owner -- user_<clerk-user-id>` after that person appears in the Auth pane, or set `GARAGE_OWNER_USER_IDS` to a comma-separated allowlist of Clerk user IDs before they first sign in.

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

- When the user says “deploy,” first commit and push the code to GitHub, then deploy the GitHub-backed project to Cloudflare Workers using the documented Cloudflare production architecture.
- Treat this GitHub-to-Cloudflare Workers flow as the default production deployment target; do not use Replit Deployments unless the user explicitly requests another platform.

## Architecture decisions

- Customer site and admin share one responsive app so Creative Coders can embed a single service sample.
- The imported Sample Handyman application is the visual and feature reference; garage-door changes should adapt its content and safety workflows without introducing a separate design direction.
- Media is admin-configurable through hosted image URLs now; R2 is the Cloudflare production upload target.
- The AI assistant is constrained to safe intake guidance and must never coach customers through high-tension repairs.
- API contracts remain provider-neutral so the Express preview adapter can be moved to Workers + D1 without redesigning the frontend.
- The current Cloudflare demo Worker serves public customer APIs only. Staff leads, dashboard, request mutations, and full settings APIs deliberately return 501 until the Worker is connected to a Clerk-verified persistent admin backend.

## Product

- Service catalog, ZIP response-time check, online booking, reviews, project gallery, emergency messaging, and AI issue triage.
- Admin dispatch dashboard, lead status management, business settings, five authentic theme presets, service ID, and photo controls.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
