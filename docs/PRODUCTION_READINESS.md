# Production Readiness — Spec Section 91

This maps the spec's Section 91 checklist against what is actually
implemented and verified, versus what still requires action outside this
repository (real Supabase project configuration, hosting, or a genuinely
separate environment) before going live. Nothing below is aspirational —
each ✅ item was integration-tested against a real Postgres server using the
harness in `supabase/testing/` (see the root README's "Testing notes"
section), not just reviewed by reading the SQL.

## Security

| Item | Status | Notes |
| --- | --- | --- |
| RLS enabled | ✅ | Every table has RLS enabled (`0007_row_level_security.sql`). `integration_secrets` has RLS enabled with **zero** policies — deny-by-default, verified no `authenticated`/`anon` role can read it even indirectly. |
| Protected routes | ✅ | `ProtectedRoute` gates every client/admin route; `requirePermission` gates each admin page individually (`src/app/routes.tsx`). |
| Permission checks | ✅ | `has_permission()` enforced server-side in every RPC, not just client-side route guards — a direct `supabase.rpc(...)` call from a non-authorized role is rejected by Postgres itself, verified in `supabase/testing/integration_test.sql`. |
| Server-side secret storage | ✅ | `integration_secrets` never granted to `authenticated`/`anon`; only reachable via `security definer` RPCs that return masked values. Client secrets (`.env` `VITE_*`) contain no provider credentials. |
| Webhook verification | ✅ | `complete_sandbox_deposit()` verifies HMAC-SHA256 via pgcrypto's `hmac()` against the stored `webhook_secret`; wrong-signature, correct-signature, and role-permission-denied cases all verified locally (Phase 10, re-verified this phase for idempotency interaction — see below). |
| Input validation | ✅ | Every financial RPC validates amount ranges, account status, and enum fields server-side before writing (never trusts client-computed values). |
| Rate limiting | ⚠️ Partial | Added a 10-second double-submit cooldown on `request_withdrawal()` (this phase) — verified: a second call within 10s of a prior one raises before any other validation runs. Broader API rate limiting (e.g. login attempts, general RPC throttling) is a Supabase-platform / API-gateway concern, not application code — see "Deferred to real deployment" below. |

## Data

| Item | Status | Notes |
| --- | --- | --- |
| Database migrations | ✅ | 16 migrations in `supabase/migrations/`, applied in order, each integration-tested against a real Postgres server. |
| Backup strategy documentation | ⚠️ Deferred | Supabase manages automated backups (PITR on paid plans) — this is a dashboard/billing-plan setting on the real project, not something this codebase configures. Documented here so it isn't silently skipped: **enable Point-in-Time Recovery or scheduled backups in your Supabase project's Settings → Database before going live.** |
| Environment separation | ⚠️ Partial | `VITE_APP_ENVIRONMENT` (development/demo/sandbox/production) drives the environment badge and which `PaymentProvider` is resolved — it is never a privilege-escalation path by itself (server-side RPCs don't trust it). True isolation (separate data, separate credentials) requires genuinely **separate Supabase projects** per environment, which is an infrastructure decision outside this repo — the app is built to support that (same schema, different `.env` per project). |

## Financial Operations

| Item | Status | Notes |
| --- | --- | --- |
| Server-side calculations | ✅ | Every balance change (deposits, withdrawals, investments, adjustments) happens inside a `security definer` RPC; the client never computes or writes a balance directly (`guard_profile_financial_fields()` trigger blocks direct writes outside RPCs). |
| Transaction records | ✅ | Every balance-affecting RPC inserts a matching `transactions` row with `balance_before`/`balance_after`, atomically in the same function. |
| Audit logs | ✅ | Admin actions (balance adjustments, role changes, withdrawal reviews, market overrides) already logged. **This phase closes a real gap**: settings changes (branding, white-label, system settings, maintenance, compliance) previously had *no* audit trail at all, despite spec section 70 explicitly listing "Changed Site Name" / "Enabled Maintenance" as required audit examples. Added a generic `audit_settings_change()` trigger on all 5 settings tables — verified it logs only the fields that actually changed, with before/after values, and does *not* fire a spurious row on a no-op update. |
| Idempotency for provider operations | ✅ | **This phase's main fix**: `demo_complete_deposit()` and `complete_sandbox_deposit()` previously raised an exception on a duplicate webhook/confirmation call for an already-completed deposit — which a real payment provider interprets as failure and retries forever. Both now return the existing row as a no-op success on redelivery of a completed deposit, while still raising for genuinely abnormal states. For the sandbox provider specifically, verified the signature check still runs *before* the idempotency short-circuit, so a bad-signature replay against a completed deposit still fails — idempotency doesn't create a signature-bypass path. |

## Integrations

| Item | Status | Notes |
| --- | --- | --- |
| Sandbox configuration | ✅ | `SandboxPaymentProvider` + `complete_sandbox_deposit()` fully implemented and tested — creates a pending deposit, requires a real HMAC-verified webhook call to confirm, never self-confirms. |
| Production configuration | ⚠️ Deferred | No real third-party payment/KYC/email provider is wired up (never authorized/requested) — `PaymentProvider` for `production` environment intentionally throws rather than pretending to work. The `IntegrationsPage` UI and `integration_configs`/`integration_secrets` schema are ready to hold real credentials once a real provider is chosen. |
| Connection testing | ✅ | `test_integration_connection()` RPC + `IntegrationsPage` UI; currently validates presence/shape of stored credentials (no real provider to call yet — see above). |
| Error handling | ✅ | Every service-layer call wraps Supabase/RPC errors and surfaces them via the toast system; RPC-level validation errors (insufficient balance, disabled deposits, maintenance mode, cooldown, etc.) all propagate as readable messages rather than raw Postgres errors. |

## What changed in this phase (`0016_hardening.sql`)

1. Idempotent `demo_complete_deposit()` / `complete_sandbox_deposit()` — redelivery of a completed deposit is now a no-op success, not an error.
2. Negative-balance guard in `adjust_user_balance()` — a debit that would take `available_balance`, `bonus_balance`, or `invested_balance` below zero now raises instead of silently going negative. (`total_balance` is left uncapped since an admin may legitimately need to zero/correct it directly.)
3. `audit_settings_change()` trigger — automatic, can't-be-forgotten audit logging on `branding`, `white_label_settings`, `system_settings`, `maintenance_settings`, `compliance_settings`.
4. 10-second double-submit cooldown on `request_withdrawal()`.
5. New indexes: `profiles(email)`, `deposits(provider, status)`, `withdrawals(created_at desc)`, `announcements(is_active) where is_active`.

All five were verified against the local Postgres integration-test harness: idempotent redelivery (both providers, including that a bad signature still fails post-completion), the negative-balance guard rejecting an overdraft while allowing a valid debit, each settings-table trigger producing a correctly-diffed audit row (and *not* firing on a no-op update), the withdrawal cooldown rejecting an immediate second request while a fresh client's first request still succeeds, and all four indexes present after migration.

## Deferred to real deployment (cannot be verified from this development session)

- **Login attempt limiting / Auth Hooks** — Supabase Auth's brute-force protection and custom hooks are dashboard-configured on the real project, not something a migration can set up.
- **Backup/PITR** — enable in Supabase project Settings → Database (see above).
- **True environment separation** — requires separate Supabase projects for Development/Demo/Sandbox/Production, a deployment decision, not a code change.
- **Edge Function runtime behavior** — `payment-webhook` and `simulate-sandbox-webhook` are written but were never deployed or invoked over the network from this session (no network access to Supabase at all here). Verify them yourself after deploying, per `supabase/deploy/README.md`.
- **Real third-party provider credentials** — no live payment gateway, KYC vendor, or email/SMS sender is connected; none was requested.
- **Platform-level rate limiting** — Supabase's own API gateway provides baseline request throttling; this repo only adds the withdrawal-specific cooldown above.
