---
name: SPA client-side admin-host redirect
description: Why /admin kept bouncing to production in dev, and where host policy lives
---

The admin SPA has its own client-side host policy (`src/lib/hosts.ts` in the Worker app): `shouldRedirectAdminPath()` does `window.location.replace()` to the production admin domain for any hostname not in `keepPathBasedAdmin()`. The Worker also has a parallel server-side copy of this logic.

**Why:** Dev "redirects to production" bugs looked like server/cache issues but were the SPA redirecting itself; the client allowlist had drifted from the server's dev policy.

**How to apply:** Any change to dev/admin host handling must update BOTH the client and worker host predicates. Also: Hono's `setCookie(c, ...)` is dropped when a handler returns a raw `Response` — append `Set-Cookie` on the returned response's headers instead.
