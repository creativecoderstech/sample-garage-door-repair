/**
 * Runs inside the Miniflare Workers sandbox before each test file.
 * Picks up the migrations provided by vitest.global-setup.ts and applies
 * them to the test D1 database so the full schema is available.
 */
import { env } from "cloudflare:test";
import { beforeAll } from "vitest";
import { inject } from "vitest";
import type { D1Migration } from "@cloudflare/vitest-pool-workers";

beforeAll(async () => {
  const migrations = inject<D1Migration[]>("d1Migrations");
  if (!migrations?.length) return;
  const db = (env as any).DB as D1Database;
  for (const migration of migrations) {
    for (const query of migration.queries) {
      if (query.trim()) {
        await db.prepare(query).run();
      }
    }
  }
});
