---
name: Pages analytics bindings
description: Cloudflare Pages deployment behavior when Analytics Engine is not enabled for the account.
---

Do not attach an Analytics Engine dataset binding unless Analytics Engine is
already enabled for the Cloudflare account. A Pages upload can compile and
upload successfully, then fail only at the final Function publish step.

**Why:** This account accepted the Pages binding configuration but rejected
the deployment because Analytics Engine had not been activated account-wide.
Web Analytics plus a dedicated D1 event table provided the required traffic
and product-event coverage without that dependency.

**How to apply:** Check account activation before adding an Analytics Engine
binding. If activation is unavailable or unnecessary, keep Web Analytics for
traffic metrics and write a small allowlisted, PII-free event stream to D1.