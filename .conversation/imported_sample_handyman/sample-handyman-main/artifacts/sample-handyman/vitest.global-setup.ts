/**
 * Runs in Node.js (outside Miniflare) before any test file.
 * Reads D1 migration files from disk and provides them to the Worker-side
 * setup via vitest's inject/provide API.
 */
import { readD1Migrations, type D1Migration } from "@cloudflare/vitest-pool-workers";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Vitest 4: provide is passed as a parameter to setup(), not imported
export async function setup({
  provide,
}: {
  provide: (key: string, value: unknown) => void;
}) {
  const migrations: D1Migration[] = await readD1Migrations(
    path.join(__dirname, "migrations"),
  );
  provide("d1Migrations", migrations);
}
