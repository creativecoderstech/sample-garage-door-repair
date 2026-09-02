---
name: GitHub and Cloudflare deployment
description: Deployment-specific connector behavior and hostname propagation lessons.
---

GitHub's connector API may allow repository contents writes while blocking low-level Git blobs/trees; a workspace Git push with a securely stored token is the reliable fallback. Cloudflare Worker custom-domain attachment creates a proxied placeholder DNS record, and the certificate can take several minutes before HTTPS handshakes succeed.

**Why:** The release encountered both behaviors in the same environment, and treating either as an application failure would lead to unnecessary code changes.

**How to apply:** Prefer the authenticated workspace Git transport for complete repository pushes. After attaching a Worker hostname, verify DNS and wait for certificate issuance before diagnosing the Worker.