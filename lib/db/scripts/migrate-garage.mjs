import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../migrations");
const files = (await readdir(root))
  .filter((name) => /^\d{4}_.+\.sql$/.test(name))
  .sort((a, b) => a.localeCompare(b));
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS garage_schema_migrations (
      version text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamp with time zone NOT NULL DEFAULT now()
    )
  `);

  for (const file of files) {
    const sql = await readFile(resolve(root, file), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = await client.query(
      "SELECT checksum FROM garage_schema_migrations WHERE version=$1",
      [file],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].checksum !== checksum) {
        throw new Error(`Migration ${file} changed after it was applied.`);
      }
      continue;
    }
    await client.query("BEGIN");
    try {
      await client.query("SELECT pg_advisory_xact_lock(hashtext('garage-schema-migrations'))");
      const raced = await client.query(
        "SELECT checksum FROM garage_schema_migrations WHERE version=$1",
        [file],
      );
      if (raced.rows[0]) {
        if (raced.rows[0].checksum !== checksum) {
          throw new Error(`Migration ${file} changed while migration was running.`);
        }
      } else {
        await client.query(sql);
        await client.query(
          "INSERT INTO garage_schema_migrations(version,checksum) VALUES ($1,$2)",
          [file, checksum],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  client.release();
  await pool.end();
}