#!/usr/bin/env node
/**
 * Upload the default Gallery images to R2 for the given env (dev|production).
 * Usage: node ./scripts/seed-gallery-defaults.mjs [dev|production]
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const assets = path.resolve(root, "..", "..", "attached_assets", "generated_images");

const envName = process.argv[2] === "production" ? "production" : "dev";
const bucket =
  envName === "production" ? "penny-lane-media-prod" : "penny-lane-media-dev";

const files = [
  ["tv-mounting.jpg", "gallery/defaults/tv-mounting.jpg"],
  ["plumbing-repair.jpg", "gallery/defaults/plumbing-repair.jpg"],
  ["furniture-assembly.jpg", "gallery/defaults/furniture-assembly.jpg"],
  ["hands-working.jpg", "gallery/defaults/hands-working.jpg"],
  ["hero-light-fixture.jpg", "gallery/defaults/hero-light-fixture.jpg"],
  ["tools-workbench.jpg", "gallery/defaults/tools-workbench.jpg"],
];

console.log(`Seeding gallery defaults → R2 bucket ${bucket} (${envName})`);

for (const [localName, key] of files) {
  const localPath = path.join(assets, localName);
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "wrangler",
      "r2",
      "object",
      "put",
      `${bucket}/${key}`,
      "--file",
      localPath,
      "--content-type",
      "image/jpeg",
      "--remote",
    ],
    { cwd: root, stdio: "inherit", env: process.env },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Gallery default images uploaded.");
