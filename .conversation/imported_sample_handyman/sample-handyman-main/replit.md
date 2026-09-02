# Sample Handyman

## Overview
Marketing site + admin panel for Sample Handyman, built as a single Cloudflare Worker (`artifacts/sample-handyman/`): Hono API in `worker/`, Vite/React SPA in `src/`, with D1, KV, and R2. Local dev runs via `wrangler dev` on port 5000 (`wrangler.local.jsonc`). Production is deployed to Cloudflare (sample-handyman.com / admin.sample-handyman.com) with `pnpm run deploy` in `artifacts/sample-handyman/`.

## User preferences
- **Always run the full release workflow when asked to "deploy" or "release".** Steps in order: (1) ensure all work is committed to `develop`; (2) **always ask the user which bump type (patch/minor/major) before proceeding**; (3) bump version in all workspace package.json files; (4) commit `chore: release vX.Y.Z` on `develop`; (5) `gitPush develop`; (6) fast-forward merge `develop → main`; (7) create annotated tag `vX.Y.Z`; (8) push main + tag using `GITHUB_TOKEN` via `scripts/release.ts` `push()` helper (`git -c http.extraHeader=... push origin main --follow-tags`); (9) switch back to `develop`; (10) `pnpm run deploy` in `artifacts/sample-handyman/`. The `GITHUB_TOKEN` secret enables full tag pushes — run `pnpm release patch|minor|major` from the workspace root on the `develop` branch.
- Always pass `provider: "github"` to `gitPush` — omitting it silently succeeds without actually pushing.
