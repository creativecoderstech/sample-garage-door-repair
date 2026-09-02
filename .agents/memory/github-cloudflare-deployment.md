---
name: GitHub and Cloudflare deployment
description: Deployment-specific connector behavior and hostname propagation lessons.
---

GitHub's connector API may allow repository contents writes while blocking low-level Git blobs/trees; a workspace Git push with a securely stored token is the reliable fallback. Cloudflare Worker custom-domain attachment creates a proxied placeholder DNS record, and the certificate can take several minutes before HTTPS handshakes succeed.

For repository-backed Workers that use the Cache API to proxy built assets from GitHub, include the pinned GitHub revision in the cache key. Otherwise a successful Worker deployment can keep serving the previous HTML manifest and its old hashed bundles until the edge cache expires.

**Why:** Releases encountered Git transport restrictions, certificate propagation, and a stale HTML manifest after a successful Worker version promotion. Treating any of these as application failures would lead to unnecessary source changes.

**How to apply:** Prefer authenticated workspace Git for complete pushes. A GitHub push does not promote this Worker by itself: upload the Worker separately with the pushed commit as `ASSET_REVISION`. Read the full SHA from `git rev-parse HEAD`, confirm `git ls-remote origin refs/heads/main` matches, and never type or reconstruct the SHA manually. Version cache keys with that revision. After attaching a hostname, allow certificate propagation before diagnosing the Worker.

The custom Cloudflare hostname serves the app at `/`, while Replit's production bundle is built with the `/sample-garage-door-repair/` artifact base. The Worker must normalize that prefix before fetching assets, and the client router must only apply the configured base when the current pathname actually contains it.

**Why:** Without Worker normalization, the HTML loads but its prefixed JavaScript and CSS return 404, producing a blank page. Without an adaptive router base, the assets load but no root route matches, leaving only the shared header and footer.