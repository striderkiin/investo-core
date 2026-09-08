# One-time hosted-project bootstrap

These files exist because this development session's network is blocked from
reaching Supabase directly (org egress policy + this proxy never tunnels raw
Postgres). `supabase/migrations/` remains the source of truth for the CLI
workflow (`supabase link` + `supabase db push`) — use these only when you
need to apply everything by hand through the Dashboard's SQL Editor instead.

- **001_schema_bootstrap.sql** — every migration (0001-0009), concatenated in
  order and wrapped in one transaction. Paste the whole file into SQL Editor
  and run it once against a fresh project.
- **002_promote_super_admin.sql** — run after creating your first admin
  account through Authentication → Add User. Fill in the email, run it.

See the repo root README's "Database setup" section for the full step-by-step.
