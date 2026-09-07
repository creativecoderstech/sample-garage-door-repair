# Cumming Garage Door Service

Commercial garage-door website, customer requests, Maya safety-first assistance,
and Google-authenticated staff administration. The internal package/Pages project
name remains `sample-garage-door-repair` for compatibility.

**Technical preview, not approved for public launch.** The owner has authorized
temporary contact, hours and coverage examples. They are not verified facts and
cannot enable contact actions, notifications, factual Maya answers or indexing.
See [the pre-launch checklist](artifacts/sample-garage-door-repair/PRELAUNCH.md).

Production remains **Cloudflare Pages advanced-mode Functions + D1 + R2 +
Workers AI + Turnstile**. Do not change it to a standalone Worker. PostgreSQL and
the Express adapter serve the isolated development environment.

<!-- creativecoders-provisioning:begin -->
```json
{
  "schemaVersion": 1,
  "runtime": "pages",
  "appDirectory": "artifacts/sample-garage-door-repair",
  "healthPath": "/api/garage/site-settings",
  "commands": {
    "build": "PORT=22004 BASE_PATH=/ pnpm --filter @workspace/sample-garage-door-repair run build:pages",
    "deploy": "wrangler pages deploy dist/public --project-name sample-garage-door-repair",
    "migrations": {
      "directory": "cloudflare/migrations"
    }
  },
  "resources": {
    "d1": true,
    "kv": false,
    "r2": true,
    "ai": true,
    "email": false
  },
  "pages": {
    "package": "@workspace/sample-garage-door-repair",
    "assetsDirectory": "dist/public",
    "functionsEntry": "dist/public/_worker.js",
    "bindings": {
      "d1": "DB",
      "r2": "MEDIA",
      "ai": "AI",
      "assets": "ASSETS"
    },
    "variables": [
      "CLOUDFLARE_ENV",
      "PUBLIC_SITE_ORIGIN",
      "TURNSTILE_SITE_KEY",
      "NOTIFICATION_ALLOWED_HOSTS",
      "CLERK_PUBLISHABLE_KEY",
      "CLERK_ISSUER",
      "GARAGE_BOOTSTRAP_EMAIL"
    ],
    "secrets": [
      "TURNSTILE_SECRET_KEY",
      "CLERK_SECRET_KEY"
    ]
  }
}
```
<!-- creativecoders-provisioning:end -->

`email: false` means no direct email-sending binding is provisioned. Requests use
an owner-configured HTTPS notification webhook; an email or dispatch automation
can be its receiver. A successful persisted request is not an appointment or a
claim that notification delivery succeeded.