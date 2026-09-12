import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

// The client dashboard lives outside the React SPA as a separate multi-page
// app under client-app/ (see client-app/README.md for why) — each of its
// HTML files needs to be a real Rollup entry point, or `vite build` only
// ever emits the SPA's own index.html and everything under /app/ 404s in
// production even though it works fine against the dev server.
const CLIENT_APP_PAGES = ['index', 'my-wallet', 'account', 'transaction', 'crypto', 'settings', 'notifications', 'message'];

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        ...Object.fromEntries(
          CLIENT_APP_PAGES.map((page) => [
            `client-app-${page}`,
            fileURLToPath(new URL(`./client-app/${page}.html`, import.meta.url)),
          ])
        ),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
