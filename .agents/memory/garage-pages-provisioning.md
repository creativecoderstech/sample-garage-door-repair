---
name: Garage Pages provisioning contract
description: Protect the garage-door Pages runtime and its production resource bindings during repository provisioning changes.
---

Keep the garage-door provisioning contract on Cloudflare Pages with its advanced-mode Function. It must declare D1, R2, Workers AI, and both Turnstile variables; do not switch the provisioning runtime to a standalone Worker unless the migration is intentional and includes a real, validated Wrangler configuration.

**Why:** A repository provisioning change declared a standalone Worker with a nonexistent config and omitted Turnstile variables. The change also left Pages bound to a deleted D1 database, breaking public settings and services until a new database was migrated and rebound.

**How to apply:** Before pushing provisioning metadata, validate the documented build and deploy commands. After any runtime or binding change, inspect the Pages production configuration, confirm every resource still exists, and curl D1-backed public endpoints before considering the release healthy.