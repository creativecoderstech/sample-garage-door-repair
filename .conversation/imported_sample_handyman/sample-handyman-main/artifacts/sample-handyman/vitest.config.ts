import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.test.jsonc" },
    }),
  ],
  test: {
    globalSetup: ["./vitest.global-setup.ts"],
    setupFiles: ["./worker/vitest-setup.ts"],
    // Only run Worker-side tests. Component tests (src/**) run under
    // vitest.component.config.ts with happy-dom.
    include: ["worker/**/*.test.{ts,tsx}"],
  },
});
