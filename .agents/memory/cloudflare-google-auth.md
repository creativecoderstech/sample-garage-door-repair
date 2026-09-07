---
name: Cloudflare-first Google authentication
description: Durable authentication and deployment constraints for the garage website.
---

The garage website is a Cloudflare Infrastructure First project deployed through Cloudflare Pages. Staff authentication must use Google Identity Services directly, with Google ID tokens verified by the Pages Worker. Do not reintroduce Clerk or Replit login.

**Why:** The project owner explicitly rejected Clerk and confirmed Cloudflare Pages as the production runtime.

**How to apply:** Treat the Cloudflare Worker implementation and D1 authorization tests as authoritative. Keep local Express/PostgreSQL behavior in parity. Require the exact protected bootstrap Google email, and provision the Google OAuth client ID to both the Vite build and Worker environment.