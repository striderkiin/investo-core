# Client dashboard — Critso-based multi-page app

The client-facing dashboard (everything a logged-in **client** sees after
signing in) is not part of the React SPA in `src/`. It's the licensed
"Critso" crypto dashboard template's own actual HTML/CSS/jQuery/ApexCharts
pages, kept as close to the original markup and visual structure as
possible, with real data wired in through small TypeScript modules under
`ts/`.

**Why a separate stack for one part of the app**: the visual fidelity bar
for the client dashboard is "look like Critso, restyled" — porting its
markup into React/Bootstrap components lost too much of the original
structure across two attempts. Lifting the actual template and wiring real
data into it directly gets a pixel-accurate result. The public marketing
site and the admin panel are unaffected — they're still the React app in
`src/`, and this only replaces what a **client** sees after `/login`.

## How it fits together

- `vite.config.ts` registers each page here (`index.html`, `my-wallet.html`,
  etc.) as its own Rollup entry point, so `npm run build` bundles them
  alongside the SPA's own `index.html` instead of only building the SPA.
- Static assets (`css/`, `js/`, `images/`, `font/`, `icon/` — Critso's own
  files, referenced by plain non-module `<script src>`/`<link href>` tags)
  live in `public/client-app/` instead of here, because Vite only copies
  assets it can trace through module imports or `public/` — a plain
  `<script src="js/jquery.min.js">` tag doesn't get bundled or copied
  automatically the way an `import` would.
- `ts/shell.ts` runs on every page: confirms there's a real logged-in
  **client** session (via the same `authService`/Supabase client the React
  app uses — `src/services/...`, imported directly by relative path),
  redirects to `/login` if not, populates the shared header (name, role,
  avatar), and wires the logout link.
- `ts/dashboard.ts` (loaded only by `index.html`) fetches real portfolio
  totals, market data, and investment-by-plan composition and writes them
  into the page — the exact same service layer the React admin/client
  pages already use, just called from vanilla TS instead of React hooks.
- After login, `LoginPage.tsx` in the React app sends **clients** to
  `/client-app/index.html` with a real page navigation (not react-router)
  since this is a different app; **admins** still go to `/admin` inside
  the SPA as before.

## What's been cut from the original template

Per the client dashboard build brief: no Buy/Sell Order tables, no
Exchange or Component nav items/pages — none of that maps to anything this
platform does (deposits/withdrawals go through the existing provider
system, not a peer-to-peer order book).

## Status

`index.html` (Dashboard Home) is fully wired to real data. The remaining
pages (`my-wallet.html`, `account.html`, `transaction.html`, `crypto.html`,
`settings.html`) still show Critso's own static demo data and need the
same treatment.
