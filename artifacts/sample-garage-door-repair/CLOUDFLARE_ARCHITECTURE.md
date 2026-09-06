# Cloudflare-first production architecture

The application is organized around portable HTTP contracts so the same customer and admin UI can run at Cloudflare's edge.

## Target topology

- **Cloudflare Pages + Pages Functions** serve the Vite SPA and public API globally.
- **D1** stores service requests, business settings, theme choice, Creative Coders service ID, and media metadata.
- **R2** stores business-uploaded hero and gallery photography. The current admin also accepts licensed stock-photo URLs, making the media surface usable before an R2 upload workflow is connected.
- **Workers AI** is the production target for the safety-constrained garage-door assistant. Local preview uses Replit AI Integrations and does not require a user API key.
- **Turnstile** should protect public lead and assistant forms before a live advertising campaign.
- **Turnstile and application rate limiting** protect the public assistant and
  request forms in this sample. A real customer deployment should add WAF
  rules and Cloudflare Access before enabling staff operations.
- **Cloudflare Access is intentionally disabled here.** This sample leaves
  `/admin`, `/login`, and staff APIs available to any caller. A real
  customer deployment must add Access before exposing business data.
- **Web Analytics** should record service-page views, booking starts, completed requests, phone clicks, and iframe referrals.

## Creative Coders embedding

The Cloudflare headers permit framing only from `creativecoders.tech` and its subdomains. The admin-managed `serviceId` is the stable catalog key Creative Coders can associate with this sample. The app uses relative routes and responsive layouts so it remains usable inside an iframe.

## Theme catalog

1. **Industrial** — high-visibility orange and charcoal for emergency-focused repair operators.
2. **Trust** — reassuring blue for established suburban service companies.
3. **Eco** — natural green for energy-efficient doors and sustainability positioning.
4. **Modern** — architectural monochrome with red accents for premium contemporary installations.
5. **Classic** — navy and gold for long-standing family service brands.

## Production bindings

Create separate preview and production resources. Bind them with these names:

- `DB`: D1 database
- `MEDIA`: R2 bucket
- `AI`: Workers AI
- `ASSETS`: Pages' built-in static asset binding

Additional variables are `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.
Access variables are intentionally absent from this sample. A real deployment
must add its own Cloudflare Access policy and JWT configuration before exposing
staff routes.

Never commit Cloudflare IDs or secrets. Resource identifiers belong in deployment configuration and secrets belong in Cloudflare's encrypted secret store.

## Release procedure

The production target is the `sample-garage-door-repair` Cloudflare Pages
project. Its advanced-mode Pages Function is generated as
`dist/public/_worker.js`, and non-API requests are served through Pages'
`ASSETS` binding.

1. Run `PORT=22004 BASE_PATH=/ pnpm run build:pages` from this artifact
   directory.
2. Apply the schema to the bound database with
   `D1_DATABASE_NAME=your-database-name pnpm run migrate:d1:remote`. The
   database name is supplied at deploy time and is not committed. D1 applies
   the numbered migrations in order and records each application; do not paste
   the files into a startup handler or reset the database. Migration
   `0002_garage_content.sql` is additive and uses `INSERT OR IGNORE`, preserving
   owner edits and deletions on later deploys.

The development PostgreSQL seed is also one-time: `seed:garage-content` writes
the `garage-content-v1` marker and seed rows in one transaction. Once the marker
exists, rerunning post-merge setup does not recreate content an owner deleted.
3. Confirm `dist/public/_worker.js`, `index.html`, and the generated assets
   exist.
4. Commit and push the source changes to `main` for Git-connected deployments,
   or run `wrangler pages deploy dist/public --project-name
   sample-garage-door-repair` for a direct upload.
5. Verify `/`, `/sample-garage-door-repair/`, generated JavaScript and CSS, and
   representative public API responses on the Pages deployment.

### Production administration safety gate

The login-free admin is a local development demo, not production authorization.
Express enables its demo staff APIs only with `NODE_ENV=development`. The Pages
worker denies all staff reads/writes on public hosts. A local Worker test may
set `LOCAL_DEMO_ADMIN=true`, but the request must also use a loopback hostname;
this cannot enable access on a public hostname. Do not configure that test
binding for a Pages deployment.

Public content, educational guides, Maya, and service-request submission remain
available. Production editing, settings, customer-request administration, and
staff uploads require a separate real authorization implementation. No
deployment or authentication-provider migration is part of this rebuild.

The previous standalone Worker release metadata remains available only as a
rollback path. Account IDs, zone IDs, API credentials, and other Cloudflare
resource identifiers must remain outside the repository.