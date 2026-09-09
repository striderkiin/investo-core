# Gap Analysis — spec compliance audit

A full pass of every one of `docs/SPEC.md`'s 97 sections against the actual
codebase, done after Phase 11 + the two post-build corrections (Live
Provider/Manual Override, Social Proof). The overwhelming majority of the
spec is genuinely built and tested, not stubbed. This records what isn't,
so it doesn't get lost.

## Real gaps

**Admin — Compliance Center: DB-only, no UI.** `compliance_settings`
(migration `0004_platform_config.sql`) has all six spec'd JSONB sections,
RLS, and an audit trigger, but there is no admin page, no service, and no
nav entry anywhere. Completely inaccessible from the admin panel.

**Client Onboarding Status: never built.** No tracking anywhere of
Registered / Email Verified / Profile Complete / Verification Pending /
Verified / Restricted (spec §66).

**User Management actions incomplete** (`UsersPage.tsx`). Missing:
standalone **View** (profile detail, distinct from "View Ledger"),
**Edit**, a distinct **Add Bonus** action (only generic Adjust Balance
exists), **View Referrals**, **View Security**. No real avatar image field
either.

**Activity Simulation Engine is config with no consumer.** `activity_settings`
persists correctly and is editable in `ActivitySimulationPage.tsx`, but
nothing anywhere generates a visible simulated deposit/withdrawal/
investment/referral/upgrade event from it — it's a dead settings panel. (Not
to be confused with the newer, separate, fully-wired Social Proof system.)

**Referral Tree Viewer isn't a visual tree.** `ReferralTreeNode.tsx` is a
recursive indented expand/collapse list, not a diagram with connecting
lines. Clicking a node only shows invested balance, not deposits/earnings.

**Email provider has no "Send Test Email."** Only a generic "Test
Connection" shared across all provider types; no email-specific fields
(From Name, From Email, Reply-To), no real send.

**MFA gaps**: no recovery codes, no device management (just a raw
user-agent string in `user_sessions`), no client-facing login history (the
client only sees a session count in `SecuritySettingsSection.tsx`; admins
see `security_events` in `SecurityCenterPage.tsx`, clients don't).

**Manual Chart Movement's Smooth/Sharp toggle (spec §21) doesn't exist** —
only the 1–5 strength slider.

**Both edge functions remain undeployed/runtime-untested**
(`payment-webhook`, `simulate-sandbox-webhook`) — written correctly, never
executed against the real Deno runtime.

## Confirmed still-deferred (documented scoping decisions, not regressions)

- No holdings/units model — a client's portfolio value still doesn't react
  to market price movement (would require a real new financial subsystem).
- Social Proof privacy modes: only first_name / first_initial / anonymous
  (no city/country — this platform never collects location at signup).
- `verified_account` / `milestone` exist only as templates and admin-test
  event types, never as real production triggers (no underlying event to
  hook honestly).

## Minor naming-only deviations (not worth separate work)

- Treasury's "Add Demo Funds" covers what spec calls "Adjust Sandbox
  Balance" — same function, different label.
- Referral Analytics' "Conversion Rate" is really an average-referrals-
  per-referrer metric, not a true funnel conversion rate.

## Front-facing public pages — addressed 2026-09-09

Were thin placeholders before this pass (landing page ~47 lines with no
pricing; Terms/Privacy/Risk each two paragraphs literally ending "This is
placeholder legal copy"; Contact page a static email address with no
form). Rebuilt in migration `0020_public_pages_access.sql` +
`src/features/public/pages/*`:

- **Landing page** now pulls real active investment plans
  (`investmentService.listPlans()`, filtered to `status === 'active'`) and
  renders them with real rate/duration/min-max data. Requires the new
  `investment_plans_select_public` RLS policy (`anon` could not read this
  table at all before).
- **Terms / Privacy / Risk Disclosure** now have substantive,
  realistic-but-generic crypto-investment-platform legal copy (still a
  template — each page carries a small, tasteful notice that it should be
  reviewed by counsel before real launch, replacing the old giant
  placeholder sentence).
- **Contact page** is a real form, wired to a new `contact_messages` table
  (deliberately separate from `support_tickets`, whose `user_id` is
  `NOT NULL` by design for the authenticated in-dashboard Support Center —
  a public contact form needs to work for visitors with no account at
  all). `submitted_by` is stamped server-side by a trigger, never trusted
  from the client. Admins triage submissions from a new **Contact
  Messages** page in the admin Support area (`support.read`/`support.manage`).
