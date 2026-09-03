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
    "build": "PORT=22004 BASE_PATH=/ pnpm --filter @workspace/sample-garage-door-repair run build",
    "deploy": "wrangler deploy --config wrangler.client.json"
  },
  "resources": {
    "d1": false,
    "kv": false,
    "r2": false,
    "ai": false,
    "email": false
  },
  "worker": {
    "package": "@workspace/sample-garage-door-repair",
    "entry": "cloudflare/worker.mjs",
    "assetsDirectory": "dist/public",
    "assetsBinding": "ASSETS",
    "bindings": {}
  }
}
```
<!-- creativecoders-provisioning:end -->