import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { Connect, Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// The client dashboard lives outside the React SPA as a separate multi-page
// app under client-app/ (see client-app/README.md for why) — each of its
// HTML files needs to be a real Rollup entry point, or `vite build` only
// ever emits the SPA's own index.html and everything under /app/ 404s in
// production even though it works fine against the dev server.
const CLIENT_APP_PAGES = [
  'index',
  'my-wallet',
  'account',
  'investments',
  'transaction',
  'crypto',
  'settings',
  'notifications',
  'message',
  'sign-in',
  'sign-up',
  'forgot-password',
  'reset-password',
  'deposit',
  'withdraw',
];

const ADMIN_APP_DIR = fileURLToPath(new URL('./admin-app/', import.meta.url));
const NEXT_SHIMS = (file: string) => fileURLToPath(new URL(`./admin-app/next-shims/${file}`, import.meta.url));
const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|ico)$/i;

// admin-app/ is a verbatim copy of a Next.js template. Next resolves a static
// image import to { src, width, height } rather than a URL string, and the
// template reads `.src` off those imports, so images imported from inside
// admin-app/ get that shape too.
const adminAppStaticImages = (): Plugin => ({
  name: 'admin-app-static-images',
  enforce: 'pre',
  load(id) {
    if (id.includes('?') || !IMAGE_EXTENSIONS.test(id) || !id.startsWith(ADMIN_APP_DIR)) return null;
    return `import src from ${JSON.stringify(`${id}?url`)};\nexport default { src, width: 0, height: 0 };`;
  },
});

// Client-side routes under /admin-app/ (e.g. /admin-app/dashboard/analytics)
// must load admin-app/index.html, not the SPA's root index.html that Vite's
// default HTML fallback would serve.
const adminAppHistoryFallback = (): Plugin => {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    const pathname = req.url?.split('?')[0] ?? '';
    if (pathname.startsWith('/admin-app/') && !path.extname(pathname) && req.headers.accept?.includes('text/html')) {
      req.url = '/admin-app/index.html';
    }
    next();
  };
  return {
    name: 'admin-app-history-fallback',
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [adminAppStaticImages(), adminAppHistoryFallback(), react(), tailwindcss()],
  resolve: {
    alias: [
      // Only the admin-app template imports through `@/`; the main app and
      // client-app use relative imports.
      { find: /^@\//, replacement: `${ADMIN_APP_DIR}src/` },
      { find: /^next$/, replacement: NEXT_SHIMS('next.ts') },
      { find: /^next\/link$/, replacement: NEXT_SHIMS('link.tsx') },
      { find: /^next\/image$/, replacement: NEXT_SHIMS('image.tsx') },
      { find: /^next\/navigation$/, replacement: NEXT_SHIMS('navigation.ts') },
      { find: /^next\/dynamic$/, replacement: NEXT_SHIMS('dynamic.tsx') },
      { find: /^next\/font\/google$/, replacement: NEXT_SHIMS('font-google.ts') },
      { find: /^nextjs-toploader$/, replacement: NEXT_SHIMS('toploader.tsx') },
      { find: /^react-apexcharts$/, replacement: NEXT_SHIMS('react-apexcharts.ts') },
    ],
  },
  css: {
    preprocessorOptions: {
      scss: {
        // The template's SCSS uses @import and Bootstrap 5.3's legacy color
        // functions; these only silence Sass deprecation notices, output is
        // unchanged.
        quietDeps: true,
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'legacy-js-api', 'if-function'],
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        'admin-app': fileURLToPath(new URL('./admin-app/index.html', import.meta.url)),
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
