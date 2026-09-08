# Investo Core Suite

A modular, white-label investment platform: client dashboard, admin control
center, deposits/withdrawals, an investment engine, and a fully-featured live
market simulator with manual override controls. See [`docs/SPEC.md`](docs/SPEC.md)
for the full product specification driving this build.

Built with React + TypeScript + Vite + Bootstrap 5 on the frontend, and
Supabase (Postgres + Auth + Realtime) on the backend. Business logic lives in
a typed service layer (`src/services`), not in components — see
[Architecture](#architecture) below.

## Status

Phases 1-5 of the spec's build plan are implemented: Foundation, Client Core,
Admin Core, the Market System (automatic engine + full manual chart controls),
and Financial Flows (deposits via a swappable `PaymentProvider`, withdrawals,
treasury, ledger, balance adjustments). White-Label, real payment/KYC/email
provider integrations, Compliance, and Security-center polish are not built
yet (Phases 6+).

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (or the [Supabase CLI](https://supabase.com/docs/guides/cli) with Docker, for local development)

## Getting started

```bash
npm install
cp .env.example .env
# fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (see below)
npm run dev
```

The app runs at `http://localhost:5173`. Without Supabase configured, public
pages render normally and auth-gated pages show a clear "Supabase is not
configured" message instead of crashing — useful for frontend-only work.

## Environment variables

Copy `.env.example` to `.env`. Client-side variables must be prefixed
`VITE_` (Vite inlines them into the bundle — never put secrets there). Server-side
variables (used by Edge Functions / a future backend service, Phase 7) must
**not** be prefixed `VITE_`.

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_APP_ENVIRONMENT` | client | `development` \| `demo` \| `sandbox` \| `production`. Controls the environment badge and which `PaymentProvider` is resolved. Real environment/credential switching must stay server-authorized — this variable does not grant elevated access on its own. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | client | Your Supabase project's public API URL and anon key. |
| `SERVER_API_URL`, `PAYMENT_PROVIDER`, `EMAIL_PROVIDER`, `KYC_PROVIDER` | server | Provider selection for Phase 7. |
| `PAYMENT_API_SECRET`, `PAYMENT_WEBHOOK_SECRET`, `EMAIL_API_SECRET`, `KYC_API_SECRET` | server | Real provider credentials — set only in your hosting/Supabase project's secret manager, never committed. |

## Database setup

All schema lives in `supabase/migrations/`, applied in filename order. Never
edit the database by hand — every table, RLS policy, and financial RPC
(`adjust_user_balance`, `request_withdrawal`, `review_withdrawal`,
`create_investment`, `demo_complete_deposit`, `advance_market_automatic`) is a
migration.

### Local development (Supabase CLI)

```bash
npx supabase init      # first time only — already done in this repo
npx supabase start     # starts Postgres + Auth + Realtime + Studio in Docker
npx supabase db reset  # applies every migration, then supabase/seed.sql
```

`supabase start` prints your local `API URL` and `anon key` — put those in
`.env`. Studio (a Postgres/Auth UI) runs at `http://localhost:54323`.

### Hosted Supabase project

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push    # applies migrations to the linked project
```

Then run `supabase/seed.sql` once via the SQL Editor (or `psql`) if you want
seed data in that environment — only ever do this in Development/Demo, never
Sandbox or Production.

### Seed data

`supabase/seed.sql` creates (spec section 90):

- 1 Super Admin (`admin@investo.test`), 3 admins covering the other roles
  (`finance@investo.test`, `support@investo.test`, `ops@investo.test`)
- 20 client accounts (`client01@investo.test` … `client20@investo.test`),
  three with non-`active` account statuses so restriction/freeze/suspension
  flows have real data to render against
- All passwords: `Password123!` — **never reuse these in Sandbox/Production**
- The 4 default investment plans (Starter/Growth/Professional/Elite), a mix
  of active/completed/paused investments, 60 transactions, pending
  deposits/withdrawals, a referral chain with rewards, support tickets,
  notifications, an announcement, and market history.

Run it with `npx supabase db reset` (local) or against your hosted project as
described above.

## Local development

```bash
npm run dev        # start the Vite dev server
npm run build      # type-check (tsc -b) and production build
npm run test       # run the vitest suite once
npm run test:watch # watch mode
npm run lint        # oxlint
```

## Architecture

```
src/
├── app/            # App shell, routing, provider composition
├── components/     # Reusable, presentation-only building blocks
│   ├── common/     # Loading/Empty/Error states, MetricCard, AnimatedNumber
│   ├── layout/     # Public/Client/Admin layouts, Sidebar, Topbar
│   ├── charts/      # MarketChart (Chart.js)
│   ├── controls/   # NumericStepper, MarketArrowControl (▲/▼ + step + direct input)
│   ├── modals/     # Generic Modal
│   └── notifications/ # Toast system
├── features/       # One folder per product area (auth, client, admin, market, ...)
│   └── market/marketEngine.ts   # Pure, DB-free market simulation core (unit-tested directly)
├── hooks/          # useAuth, usePermission, useToast
├── services/       # The business-logic layer — components never call Supabase directly
│   ├── supabase/   # Client + row⇄domain-type mappers
│   ├── auth/       # authService
│   ├── api/        # userService, investmentService, depositService, withdrawalService, ...
│   ├── payments/   # PaymentProvider interface + DemoPaymentProvider + factory
│   └── market/     # marketService (persistence adapter around marketEngine)
└── types/          # Domain types + role/permission model
```

**UI → Business Logic → Service Layer → Database.** Components call service
functions; services call Supabase (or, for anything that must be atomic and
security-sensitive — balance adjustments, withdrawal validation, investment
creation, the demo deposit "webhook" — a `security definer` Postgres RPC).
This is also why the manual market controls are split into a pure,
framework-agnostic engine (`marketEngine.ts`) plus a thin persistence
wrapper (`marketService.ts`): the engine can be (and is) unit-tested with
real interaction sequences — taps, step changes, toggles — with no database
at all.

### Payment providers

`services/payments/PaymentProvider.ts` defines the interface every provider
implements (`createDeposit`, `getDepositStatus`, `requestWithdrawal`,
`getWithdrawalStatus`, `verifyWebhook`). Only `DemoPaymentProvider` exists so
far — it simulates a full deposit lifecycle with no real money, confirming
via a `security definer` RPC (the same trust boundary a real provider's
webhook handler would occupy: the frontend never marks its own deposit
complete). Sandbox and Production providers are added in Phase 7 behind the
same interface — nothing above the factory (`paymentProviderFactory.ts`)
needs to change when they land.

## Testing notes

- `src/features/market/marketEngine.test.ts` runs every scenario in spec
  section 93 (the Manual Chart Control Acceptance Test) directly against the
  pure engine.
- `src/features/admin/pages/MarketControlsPage.test.tsx` renders the real
  admin page and fires real DOM click events on the ▲/▼ buttons, proving the
  UI is actually wired to the service layer (not just the engine in
  isolation).
- `src/services/**/*.test.ts` test the service layer against a mocked
  Supabase client (request shaping, error propagation) — these do not require
  a live project.
- `supabase/testing/` (not used by the app) holds a hand-written stub of
  Supabase's `auth` schema plus an integration test script, used to validate
  every migration, RLS policy, and financial RPC against a real Postgres
  server. This was necessary because this repo's development environment
  could not pull the Supabase CLI's Docker images (network-restricted), so
  `supabase start` could not be exercised end-to-end here. Run it yourself
  with:

  ```bash
  createdb investo_test
  psql -d investo_test -f supabase/testing/auth_stub.sql
  for f in supabase/migrations/*.sql; do psql -d investo_test -f "$f"; done
  psql -d investo_test -f supabase/testing/grants.sql
  psql -d investo_test -f supabase/testing/integration_test.sql   # exercises RLS + every RPC
  psql -d investo_test -f supabase/seed.sql                        # seed data end-to-end
  ```

  If you have Docker available, `npx supabase start` is the more realistic
  option and should be preferred — the above is a fallback, not a
  replacement.
