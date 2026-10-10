import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// HQ is the owner's private panel. It is built and deployed on its own and
// never ships inside a buyer's site. It borrows the admin template's styles
// so it looks the same as the admin panel.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  envDir: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: [{ find: /^@admin\//, replacement: fileURLToPath(new URL('../admin-app/src/', import.meta.url)) }],
  },
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'legacy-js-api', 'if-function'],
      },
    },
  },
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
  },
  server: { port: 5299 },
});
