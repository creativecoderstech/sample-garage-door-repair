import { build } from "vite";
import { fileURLToPath } from "node:url";

const source = new URL("./worker.mjs", import.meta.url);
const destination = new URL("../dist/public", import.meta.url);

// Advanced-mode Pages receives one self-contained module, including content/SEO helpers.
await build({
  configFile: false,
  publicDir: false,
  build: {
    outDir: fileURLToPath(destination),
    emptyOutDir: false,
    target: "es2022",
    minify: false,
    lib: { entry: fileURLToPath(source), formats: ["es"], fileName: () => "_worker.js" },
  },
});

console.log("Prepared Cloudflare Pages advanced-mode worker.");