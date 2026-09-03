import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cloudflareDirectory = path.dirname(fileURLToPath(import.meta.url));
const artifactDirectory = path.resolve(cloudflareDirectory, "..");
const workspaceDirectory = path.resolve(artifactDirectory, "../..");

const release = JSON.parse(
  await readFile(path.join(cloudflareDirectory, "release.json"), "utf8"),
);
const worker = await readFile(
  path.join(cloudflareDirectory, "worker.mjs"),
  "utf8",
);

if (!/^[0-9a-f]{40}$/.test(release.assetRevision)) {
  throw new Error("Cloudflare release assetRevision must be a full Git SHA.");
}

if (!worker.includes(`const ASSET_REVISION = "${release.assetRevision}";`)) {
  throw new Error(
    "Cloudflare Worker ASSET_REVISION does not match cloudflare/release.json.",
  );
}

const indexPath = path.join(workspaceDirectory, release.assetRoot, "index.html");
const indexHtml = await readFile(indexPath, "utf8");
const assetPaths = [
  ...indexHtml.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g),
].map((match) => match[1]);

if (assetPaths.length < 2) {
  throw new Error("Built index.html does not reference both JavaScript and CSS.");
}

for (const assetPath of assetPaths) {
  await access(
    path.join(workspaceDirectory, release.assetRoot, assetPath.replace(/^\//, "")),
  );
}

console.log(
  `Cloudflare release verified: ${release.worker} -> ${release.assetRevision}`,
);