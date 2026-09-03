# Cloudflare-first production architecture

The application is organized around portable HTTP contracts so the same customer and admin UI can run at Cloudflare's edge.

## Target topology

- **Cloudflare Workers + Static Assets** serve the Vite SPA globally.
- **D1** stores service requests, business settings, theme choice, Creative Coders service ID, and media metadata.
- **R2** stores business-uploaded hero and gallery photography. The current admin also accepts licensed stock-photo URLs, making the media surface usable before an R2 upload workflow is connected.
- **Workers AI** is the production target for the safety-constrained garage-door assistant. Local preview uses Replit AI Integrations and does not require a user API key.
- **Turnstile** should protect public lead and assistant forms before a live advertising campaign.
- **WAF and Rate Limiting** should protect `/api/garage/assistant`, `/api/garage/requests`, and admin routes.
- **Cloudflare Access** should guard `/admin*` for the production operator team.
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
- `ASSETS`: Worker static assets

Never commit Cloudflare IDs or secrets. Resource identifiers belong in deployment configuration and secrets belong in Cloudflare's encrypted secret store.

## Release procedure

The Worker fetches immutable build assets from the GitHub revision recorded in
`cloudflare/release.json`. A Git push does not promote the Worker by itself.

1. Build the web artifact with its production `PORT` and `BASE_PATH` values.
2. Commit and push the generated `dist/public` bundle.
3. Copy the full pushed Git SHA into both `cloudflare/release.json` and the
   Worker's `ASSET_REVISION`.
4. Run `pnpm run verify:cloudflare-release` from this artifact directory.
5. Upload `cloudflare/worker.mjs` to the existing
   `sample-garage-door-repair` Worker through the configured Cloudflare
   connection.
6. Verify `/`, `/sample-garage-door-repair/`, the generated JavaScript and CSS,
   and representative public API responses on the attached production hostname.

The Git revision belongs in source control because it is not a secret. Account
IDs, zone IDs, API credentials, and other Cloudflare resource identifiers must
remain outside the repository.