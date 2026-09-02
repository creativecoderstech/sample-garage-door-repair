---
name: R2 media sync to dev
description: Why prod→dev media sync fetches over HTTP instead of the R2 API
---
The workspace Cloudflare API token has **no R2 read permission** — `wrangler r2 object get <prod-bucket>/<key> --remote` fails with 403 "Authentication error" (and still writes an empty file, exit 0).

**Why:** Discovered when building the prod→dev media sync; the token only covers Workers/D1/KV scopes.

**How to apply:** To copy prod R2 objects, fetch them through the production site's public media route (`https://sample-handyman.com/api/media/<key>`) and `wrangler r2 object put ... --local` into dev state. Also: `wrangler r2 object get` reports success in stdout noise even on failure — check file size, not exit code.
