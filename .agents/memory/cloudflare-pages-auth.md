---
name: Pages deployment authentication
description: Cloudflare Pages deployment setup and authentication constraints for this project.
---

The Pages project can be created through the Cloudflare API, but the account's GitHub Pages installation may return an internal installation error when attaching a repository. The Pages upload-token JWT is intended for asset-upload endpoints and is not accepted by Wrangler as a replacement for a full Cloudflare API token because Wrangler first performs account/project API requests.

**Why:** The repository migration reached a valid Pages project, but Git source attachment failed and multiple secure token submissions were rejected by Cloudflare's `/user/tokens/verify` endpoint as invalid API tokens.

**How to apply:** Prefer repairing the account-level GitHub Pages installation. For direct upload, use a newly created raw Cloudflare API token with Account → Cloudflare Pages → Edit permission, verify it with Cloudflare before running Wrangler, and keep the existing Worker available until the Pages deployment is live.