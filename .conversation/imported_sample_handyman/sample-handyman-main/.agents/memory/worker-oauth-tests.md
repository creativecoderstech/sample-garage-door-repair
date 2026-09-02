---
name: Worker OAuth integration tests
description: How to configure and write integration tests for the Cloudflare Worker using @cloudflare/vitest-pool-workers v0.20
---

# Worker OAuth integration tests

## vitest config (v0.20 API)
- `@cloudflare/vitest-pool-workers` v0.20 has NO `./config` subpath — `defineWorkersConfig` doesn't exist.
- The correct config uses `cloudflareTest` as a Vite plugin from the root export:
  ```ts
  import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
  import { defineConfig } from "vitest/config";
  export default defineConfig({
    plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.test.jsonc" } })],
  });
  ```
- `poolOptions.workers` was Vitest 3 syntax and logs a deprecation error in Vitest 4.

**Why:** The package was migrated from `./config` subpath + `defineWorkersConfig` to a Vite plugin pattern between v0.5 and v0.20. The codemod at `./codemods/vitest-v3-to-v4` documents this migration exactly.

## D1 in tests
- `env.DB.exec(multiLineSql)` throws `incomplete input: SQLITE_ERROR` for any SQL with newlines — even single statements.
- Always use `env.DB.prepare(sql).run()` for DDL and single-statement DML.
- For INSERT with values, use `env.DB.prepare(sql).bind(...values).run()`.

**Why:** D1's exec() implementation inside workerd has a line-by-line parser that treats newlines as separators, breaking multi-line statements.

## Mocking outbound fetch
- `fetchMock` is NOT exported from `cloudflare:test` in v0.20 (it was removed from the exports).
- Use `vi.stubGlobal("fetch", mockFn)` instead — the test file and worker handler run in the same workerd JS isolate, so the stub is visible to outbound worker fetches dispatched via `SELF.fetch()`.
- Restore in afterEach with `vi.restoreAllMocks()`.

**Why:** With `@cloudflare/vitest-pool-workers` in integration test mode, `SELF.fetch()` dispatches to the worker's handler in the same JS isolate, making `globalThis.fetch` mutations visible to worker code.

## Wrangler test config
- Use a separate `wrangler.test.jsonc` with fake (all-zeros) IDs — Miniflare creates everything in-memory.
- Omit `ai` and `assets` bindings; their routes aren't exercised by auth tests and missing bindings don't cause startup errors.
- Put Google credentials and SESSION_SECRET in `vars` so the worker sees them.
