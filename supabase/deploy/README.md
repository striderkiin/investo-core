# One-time hosted-project bootstrap

These files exist because this development session's network is blocked from
reaching Supabase directly (org egress policy + this proxy never tunnels raw
Postgres). `supabase/migrations/` remains the source of truth for the CLI
workflow (`supabase link` + `supabase db push`) — use these only when you
need to apply everything by hand through the Dashboard's SQL Editor instead.

- **001_schema_bootstrap.sql** — migrations 0001-0009 (Phases 1-5), concatenated
  in order and wrapped in one transaction. Paste the whole file into SQL Editor
  and run it once against a fresh project.
- **002_promote_super_admin.sql** — run after creating your first admin
  account through Authentication → Add User. Fill in the email, run it.
- **003_schema_bootstrap_phase6-10.sql** — migrations 0010-0015 (Phases 6-10:
  storage, integration secrets, operations, security, sandbox provider, admin
  roles). Run this AFTER 001 has already been applied — it's additive, not a
  replacement. Verified locally that it applies cleanly on top of a database
  that already has 001 applied.
- **004_schema_bootstrap_phase11.sql** — migration 0016 (Phase 11: idempotent
  webhook completion, negative-balance guard, automatic settings audit
  logging, withdrawal double-submit cooldown, added indexes). Run this AFTER
  001 and 003 have already been applied. Verified locally that it applies
  cleanly on top of a database that already has 001 + 003 applied. See
  `docs/PRODUCTION_READINESS.md` for what this closes and what's still
  deferred to your real project.
- **005_schema_bootstrap_market_override.sql** — migration 0017 (the Live
  Provider + Manual Override market architecture: multi-asset provider
  price that keeps ticking on its own while an admin's manual offset sits
  on top of it, independently, per asset). Additive to the original
  automatic/manual chart system — run AFTER 001, 003, and 004. Verified
  locally that it applies cleanly on top of a database that already has
  those three applied.
- **006_schema_bootstrap_social_proof.sql** — migration 0018 (the Social
  Proof & Activity Notification System: production event triggers on
  confirmed deposits/withdrawals/investments/referrals/signups, privacy
  filtering, an admin-controlled live-looking test-broadcast mode, and
  analytics). Run AFTER 001, 003, 004, and 005. Verified locally that it
  applies cleanly on top of a database that already has those four
  applied.

Once 003 is applied, two things still need manual setup for Phase 6/7/10 to
be fully live (not required for Phases 1-5 to keep working):
- **Edge Functions**: `supabase functions deploy payment-webhook` and
  `supabase functions deploy simulate-sandbox-webhook` — written but never
  deployed or runtime-tested from this session (no network access to
  Supabase at all). Verify them yourself before relying on Sandbox Testing.
- **Storage**: the `branding` bucket is created by 003, but Storage
  buckets/objects aren't included in a plain `pg_dump`-style bootstrap in
  every Supabase version — if logo/favicon upload errors with a
  "bucket not found", create a public bucket named `branding` by hand in
  Dashboard → Storage.

See the repo root README's "Database setup" section for the full step-by-step.
