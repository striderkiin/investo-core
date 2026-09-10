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
- `ts/dashboard.ts`, `ts/wallet.ts`, `ts/account.ts`, `ts/settings.ts`,
  `ts/transaction.ts`, `ts/plans.ts`, `ts/notifications.ts`, and
  `ts/message.ts` each drive one page's real data, using the exact same
  service layer the React admin/client pages already use, just called
  from vanilla TS instead of React hooks. `ts/format.ts` and
  `ts/walletActivity.ts` hold logic shared by more than one page
  (currency/date formatting, and the Wallet Activity list used on both
  `my-wallet.html` and `account.html`).
- The header's Notifications and Support Tickets dropdown previews are
  the same markup on every page, so `ts/shell.ts` itself populates them
  (real recent notifications, real open ticket count) right after the
  auth check — no per-page module needs to duplicate that.
- After login, `LoginPage.tsx` in the React app sends **clients** to
  `/client-app/index.html` with a real page navigation (not react-router)
  since this is a different app; **admins** still go to `/admin` inside
  the SPA as before.
- Deposit, Withdraw, and Invest actions link out to the React SPA's own
  routes (`/dashboard/deposit`, `/dashboard/withdraw`, `/dashboard/investments`)
  rather than duplicating those forms here — same Supabase session, same
  origin, so navigating between the two apps is seamless. Critso's fixed
  page set has no page of its own for any of the three.
- `tsconfig.json` in this directory is a standalone TypeScript project for
  everything under `ts/`, checked via `npm run typecheck:client-app`
  (also run as part of `npm run build`). The root `tsconfig.app.json` only
  includes `src/`, so without this, type errors in `client-app/ts/*.ts`
  passed silently — Vite's build step transpiles but doesn't type-check.
  This was caught and fixed while wiring `message.ts`.

## What's been cut or repurposed from the original template

Per the client dashboard build brief: no Buy/Sell Order tables, no
Exchange or Component nav items/pages — none of that maps to anything this
platform does (deposits/withdrawals go through the existing provider
system, not a peer-to-peer order book). The same reasoning extended to
content discovered while wiring the remaining pages, since Critso is a
generic crypto/banking dashboard template and several of its sections
have no equivalent on this platform:

- `my-wallet.html`'s virtual "Card Details" (card number, bank name,
  monthly spending-category breakdown) — removed outright; there's no
  card-issuance feature here to back it.
- `account.html`'s per-coin "Card Holding" (Bitcoin/Dash Coin/Wave/Peer
  Coin, each with fake Buy/Sell tickers) — repurposed into a real
  "My Investments" list of the client's actual plan holdings.
- `transaction.html`'s peer-to-peer From/To/Coin columns — dropped in
  favor of the real transaction fields (type, amount, balance after,
  status, reference) `ClientTransactionsPage` already uses.
- `crypto.html`'s multi-coin market table (Rank/Coin/Last Price/24h
  Change/24h Volume, one row per coin) — this platform has one market
  value, not a basket of assets, so the whole page is repurposed into a
  real Investment Plans browser instead (rate, min/max, duration, an
  Invest link). The sidebar/header nav label changed from "Crypto" to
  "Plans" to match, across all 8 pages.
- `message.html`'s fake peer-to-peer chat with other end users (Cameron
  Williamson, Ralph Edwards, etc.) — there's no messaging-between-clients
  feature on this platform, but there is a real 1:1 conversation with
  support, so the page is repurposed into the client's Support Center:
  a real ticket list, a "New Ticket" form, and a thread view with replies,
  all backed by `supportService`.
- `notifications.html` and the header's Notifications/Support dropdown
  previews (on every page) — the fake "Discount available" / "Order
  shipped" items and the fake user avatars in the message preview are
  replaced with real notifications and real ticket previews; unused
  preview slots are hidden rather than padded with anything fake.

Nothing on these pages fetches or displays fabricated per-item history
(sparkline trend data, 24h change on a per-plan basis, etc.) where no real
time-series exists for it — those decorative elements were omitted rather
than faked, consistent with the rest of this app.

## Status

All 8 pages are fully wired to real data, each through its own
`ts/*.ts` module, with a real auth guard and a real header (name,
avatar, logout, notification/ticket previews) via `ts/shell.ts`.
