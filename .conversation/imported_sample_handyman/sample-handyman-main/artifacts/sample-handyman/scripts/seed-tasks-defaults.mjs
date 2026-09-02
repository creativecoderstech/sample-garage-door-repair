#!/usr/bin/env node
/**
 * Upload default Before & After images to R2 for the given env (dev|production).
 * Usage: node ./scripts/seed-tasks-defaults.mjs [dev|production]
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const assets = path.resolve(root, "..", "..", "attached_assets", "generated_images");

const envName = process.argv[2] === "production" ? "production" : "dev";
const bucket =
  envName === "production" ? "sample-handyman-media-prod" : "sample-handyman-media-dev";

const files = [
  ["before-tv-setup.jpg", "tasks/defaults/before-tv-setup.jpg"],
  ["after-tv-mounted.jpg", "tasks/defaults/after-tv-mounted.jpg"],
  ["before-drywall-repair.jpg", "tasks/defaults/before-drywall-repair.jpg"],
  ["after-drywall-repair.jpg", "tasks/defaults/after-drywall-repair.jpg"],
  ["before-ceiling-light.jpg", "tasks/defaults/before-ceiling-light.jpg"],
  ["after-ceiling-fan.jpg", "tasks/defaults/after-ceiling-fan.jpg"],
];

function run(args) {
  const result = spawnSync("pnpm", ["exec", "wrangler", ...args], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Seeding Before & After defaults → R2 bucket ${bucket} (${envName})`);

for (const [localName, key] of files) {
  const localPath = path.join(assets, localName);
  run([
    "r2",
    "object",
    "put",
    `${bucket}/${key}`,
    "--file",
    localPath,
    "--content-type",
    "image/jpeg",
    "--remote",
  ]);
}

console.log("Before & After default images uploaded.");
