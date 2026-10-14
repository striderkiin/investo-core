# Demo build only

Files here are for the public demo database (InvestoDev). They are not
migrations: buyer sites never run them.

`demo_reset.sql` adds an hourly reset of the demo data:

- `select public.demo_capture_baseline();` saves the current demo data as the
  state to return to. Run it again after you change demo plans, customers or
  balances on purpose.
- `select public.demo_reset();` restores that state now. pg_cron runs it every
  hour (job `investo-demo-reset`).
- Branding, website content, integrations, admins and system settings are not
  reset, so changes you make there stay.

Related safeguards that ship with every build:

- `payram-payout` simulates payouts for the `demo_admin` role and never calls
  PayRam for it.
- `demo-session` clears any 2FA a visitor turned on for the shared demo client
  before each demo session.
