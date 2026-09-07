import { mkdtemp, writeFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const remote = process.argv.includes("--remote");
if (remote && !process.argv.includes("--approved-release")) {
  throw new Error("Remote migrations require explicit --approved-release after owner approval and a verified backup.");
}
const databaseName = process.env.D1_DATABASE_NAME;
const databaseId = process.env.D1_DATABASE_ID;
if (!databaseName || !databaseId) throw new Error("Set D1_DATABASE_NAME and D1_DATABASE_ID for the intended environment before applying migrations.");
const directory = dirname(fileURLToPath(import.meta.url));
await access(join(directory, "migrations", "0005_request_delivery.sql"));
const temporary = await mkdtemp(join(tmpdir(), "garage-d1-migration-"));
try {
  const configPath = join(temporary, "wrangler.json");
  await writeFile(configPath, JSON.stringify({
    name: "cumming-garage-migrations",
    compatibility_date: "2026-09-01",
    d1_databases: [{
      binding: "DB", database_name: databaseName, database_id: databaseId,
      migrations_dir: join(directory, "migrations"),
    }],
  }));
  const result = spawnSync("pnpm", ["exec", "wrangler", "d1", "migrations", "apply", "DB",
    "--config", configPath, remote ? "--remote" : "--local",
    ...(remote ? [] : ["--persist-to", resolve(directory, "../.wrangler/state")])],
  { cwd: resolve(directory, ".."), stdio: "inherit", env: { ...process.env, CI: "true" } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`D1 migration command failed (${result.status}).`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}