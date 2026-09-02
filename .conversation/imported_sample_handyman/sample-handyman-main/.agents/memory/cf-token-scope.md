---
name: CF token scope for sample-handyman prod
description: Current CF API token has Workers + D1 Edit; prod serves on workers.dev because the custom zone doesn't exist.
---

As of Aug 14, 2026 the `CLOUDFLARE_API_TOKEN` secret has Workers **and** D1 Edit access (verified: workers/scripts 200, remote D1 migrations apply OK). R2/KV expected to work (Edit Cloudflare Workers template) but not re-verified.

**Why:** Original token was D1-only; user replaced it via the "Edit Cloudflare Workers" template, which does **not** include D1 — Account → D1 → Edit had to be added manually afterward. During the gap when D1 returned 7403, prod settings rows were fixed via the open demo-mode admin API (`PUT /api/settings`) on the live worker instead of D1.

Production serves on the custom domain **sample-handyman.samples.creativecoders.tech** (zone `creativecoders.tech`, id a2a44462…) plus workers.dev. Token now also has Zone DNS Edit (user added Aug 14, 2026); D1 still returns 7403. Note: HTTPS to that custom domain fails from inside the Replit container (TLS EOF — egress restriction); verify with the external screenshot tool, not curl.

**How to apply:** Before any `wrangler deploy` or resource-creation command, verify Workers access succeeds (HTTP 200 from `/accounts/{id}/workers/scripts`). The `requestSecrets` form shows a Confirm button (not a text input) for existing secrets — the user must edit the value directly in the Replit Secrets panel to actually change it.

**Aug 15 2026 update:** Token was missing D1 Edit scope again (7403 on both wrangler `--file` import endpoint and `--command` query endpoint, and raw curl). User re-added D1 Edit permission to the token. After that, `wrangler d1 execute --remote --command` succeeded for migration 0024.
