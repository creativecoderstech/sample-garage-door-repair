import assert from "node:assert/strict";
import { readFile, access, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const here = path.dirname(fileURLToPath(import.meta.url));
const artifact = path.resolve(here, "..");
const release = JSON.parse(await readFile(path.join(here, "release.json"), "utf8"));
assert.equal(release.runtime, "pages", "Release must remain Cloudflare Pages advanced mode.");
const output = path.join(artifact, release.outputDirectory);
const html = await readFile(path.join(output, "index.html"), "utf8");
assert.match(html, /Cumming Garage Door Service/);
assert.doesNotMatch(html, /Website Preview|Sample Garage|Summit/);
assert.match(html, /noindex, nofollow, noarchive/, "Unprocessed static previews must stay non-indexed.");

const entryAssets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match => match[1]);
assert.ok(entryAssets.some(asset => asset.endsWith(".js")) && entryAssets.some(asset => asset.endsWith(".css")));
for (const asset of entryAssets) {
  assert.match(asset, /-[A-Za-z0-9_-]{8,}\.(?:js|css)$/, "Entrypoints must be fingerprinted.");
  await access(path.join(output, asset.replace(/^\//, "")));
}

const worker = await readFile(path.join(output, "_worker.js"), "utf8");
assert.match(worker, /serveSiteDocument/);
assert.match(worker, /staffActor/);
assert.match(worker, /TURNSTILE_SECRET_KEY/);
assert.doesNotMatch(worker, /raw\.githubusercontent\.com/, "Pages cannot silently fetch an obsolete remote build.");
assert.doesNotMatch(worker, /\b(?:sk_live_|sk_test_)[A-Za-z0-9]{20,}/, "Server credentials must never be bundled.");

const files = await readdir(path.join(output, "assets"));
assert.ok(files.some(file => /staff-access-.*\.js$/.test(file)), "Staff code must have a separate lazy bundle.");
for (const file of files.filter(file => file.endsWith(".js"))) {
  const source = await readFile(path.join(output, "assets", file), "utf8");
  // Vite's relative references cover lazy chunks as well as static imports.
  for (const match of source.matchAll(/["']\.\/([^"'?#]+\.(?:js|css))["']/g)) {
    await access(path.join(output, "assets", match[1]));
  }
}
const main = entryAssets.find(asset => asset.endsWith(".js"));
const entryBytes = gzipSync(await readFile(path.join(output, main.replace(/^\//, "")))).length;
assert.ok(entryBytes < 240_000, `Public entry is unexpectedly large: ${entryBytes} gzip bytes.`);
for (const migration of release.requiredMigrations) await access(path.join(here, "migrations", migration));
for (const document of ["PHOTO_SOURCES.md", "PRELAUNCH.md", "CLOUDFLARE_ARCHITECTURE.md"]) await access(path.join(artifact, document));
console.log(`Pages release verified: ${files.length} fingerprinted assets; public entry ${entryBytes} gzip bytes. No deployment performed.`);