/**
 * Separate vitest config for React component tests.
 * Uses happy-dom (lightweight browser-like env) instead of the Cloudflare
 * Workers miniflare sandbox used by vitest.config.ts.
 */
import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test-setup.ts'],
  },
});
