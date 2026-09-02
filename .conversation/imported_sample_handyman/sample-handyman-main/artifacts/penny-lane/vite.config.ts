import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const port = Number(process.env.PORT || 25965);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

const basePath = process.env.BASE_PATH || '/';
// Optional overrides help when the repo lives on iCloud Desktop (copyFile hangs).
const publicDir = process.env.VITE_PUBLIC_DIR
  ? path.resolve(process.env.VITE_PUBLIC_DIR)
  : path.resolve(import.meta.dirname, 'public');
const outDir = process.env.VITE_OUT_DIR
  ? path.resolve(process.env.VITE_OUT_DIR)
  : path.resolve(import.meta.dirname, 'dist/public');

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss()],
  publicDir,
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: false,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          // React core — split first so dependents resolve to it cleanly
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'vendor-react';
          }
          // Radix UI primitives
          if (id.includes('/@radix-ui/')) {
            return 'vendor-radix';
          }
          // Lucide icons
          if (id.includes('/lucide-react/')) {
            return 'vendor-lucide';
          }
          // TanStack Query
          if (id.includes('/@tanstack/')) {
            return 'vendor-query';
          }
          // No catch-all: let Rollup place remaining vendor code naturally
          // to avoid circular chunk warnings.
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
