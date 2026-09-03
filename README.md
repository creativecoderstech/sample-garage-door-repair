# Sample Garage Door Repair

Modern garage door repair sample application for Creative Coders.

<!-- creativecoders-provisioning:begin -->
```json
{
  "schemaVersion": 1,
  "runtime": "worker",
  "appDirectory": "artifacts/sample-garage-door-repair",
  "healthPath": "/",
  "commands": {
    "build": "pnpm --filter @workspace/sample-garage-door-repair run build",
    "deploy": "wrangler deploy --config wrangler.client.json",
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
  "worker": {
    "package": "@workspace/sample-garage-door-repair",
    "entry": "cloudflare/worker.mjs",
    "assetsDirectory": "dist/public",
    "assetsBinding": "ASSETS",
    "bindings": {
      "d1": "DB",
      "r2": "MEDIA",
      "ai": "AI"
    }
  }
}
```
<!-- creativecoders-provisioning:end -->