import { copyFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const source = new URL("./worker.mjs", import.meta.url);
const destination = new URL("../dist/public/_worker.js", import.meta.url);

await mkdir(dirname(fileURLToPath(destination)), { recursive: true });
await copyFile(source, destination);

console.log("Prepared Cloudflare Pages advanced-mode worker.");