# Sample Garage Door Repair

Modern garage door repair sample application for Creative Coders.

<!-- creativecoders-provisioning:begin -->
```json
{
  "schemaVersion": 1,
  "runtime": "pages",
  "appDirectory": "artifacts/sample-garage-door-repair",
  "healthPath": "/",
  "commands": {
    "build": "PORT=22004 BASE_PATH=/ pnpm --filter @workspace/sample-garage-door-repair run build:pages",
    "deploy": "wrangler pages deploy dist/public --project-name sample-garage-door-repair"
  },
  "resources": {
    "d1": false,
    "kv": false,
    "r2": false,
    "ai": false,
    "email": false
  },
  "pages": {
    "project": "sample-garage-door-repair",
    "package": "@workspace/sample-garage-door-repair",
    "assetsDirectory": "dist/public",
    "functionsEntry": "dist/public/_worker.js",
    "bindings": {}
  }
}
```
<!-- creativecoders-provisioning:end -->