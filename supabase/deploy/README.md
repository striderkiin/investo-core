# One-time hosted-project bootstrap

`supabase/migrations/` remains the source of truth (`supabase link` +
`supabase db push`, or applied directly via the Supabase MCP server once
connected). These concatenated files exist as a fallback for applying
everything by hand through the Dashboard's SQL Editor — e.g. from a session
with no direct network/MCP access to Supabase, or to bootstrap a second
project (staging/production) that mirrors this one.

As of migration 0020, all of these have already been applied directly to
the `InvestoDev` project via the Supabase MCP connection. You only need
these files for a *different* project.

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
- **007_schema_bootstrap_search_path_fix.sql** — migration 0019, a small
  follow-up that sets `search_path` on three Social Proof helper functions
  (`social_proof_privacy_name` and friends) to close a warning Supabase's
  own security advisor raised after 006 was applied. Run AFTER 006.
- **008_schema_bootstrap_public_pages.sql** — migration 0020, for the
  front-facing public pages: lets anonymous visitors read active investment
  plans (the landing page shows real plan data), and adds `contact_messages`
  (a public Contact form that works for logged-out visitors — deliberately
  separate from `support_tickets`, whose `user_id` is `NOT NULL` by design
  for the in-dashboard Support Center). Run AFTER 007.
- **009_schema_bootstrap_market_provider_cron.sql** — migration 0021,
  schedules `market_provider_tick()` via `pg_cron` every minute so the Live
  Provider price keeps moving even when no browser tab is open (it
  previously only ticked from a client-side `setInterval`). Run AFTER 008.
  Requires the `pg_cron` extension to be available on your project — if the
  `create extension` line fails, enable it first via Dashboard → Database →
  Extensions → pg_cron.
- **010_schema_bootstrap_social_proof_demo_ticker.sql** — migration 0022,
  adds a standalone "Demo Activity Ticker": a `demo_mode_enabled` toggle on
  `social_proof_settings` plus a `social_proof_demo_activities` table of
  canned, fictional marketing messages, seeded with 52 starter rows. Unlike
  the real Social Proof event system (006), this is anon-readable by design
  since it renders on the logged-out landing page too — it's explicit
  operator-authored placeholder content, never real user activity. Run
  AFTER 006.
- **011_schema_bootstrap_social_links.sql** — migration 0023, adds a
  `social_links` table (Twitter/X, Facebook, Instagram, LinkedIn, YouTube,
  TikTok) for the landing page's Contact section and footer icon rows.
  Seeded all-disabled with a `#` placeholder URL — enable whichever
  platforms you actually have and set the real link from Admin ->
  Branding. Reuses the existing `branding.manage` permission. No
  ordering dependency on the other bootstrap files.

**Legal pages**: Terms, Privacy, Risk Disclosure, and Refund Policy
(`src/features/public/pages/{Terms,Privacy,RiskDisclosure,RefundPolicy}Page.tsx`)
ship with realistic starter copy, not real legal advice. Have each one
reviewed by qualified legal counsel for your jurisdiction before launching
to real users — this used to be a notice on the pages themselves, but that
leaked reseller/admin context to end clients on a white-label deployment,
so it's a reminder here for whoever operates the deployment instead.

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
