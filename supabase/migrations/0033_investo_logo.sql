-- Sets the real Investo logo lockup as the sitewide default, replacing the
-- generic Bootstrap icon + "Investo" text placeholder that rendered
-- whenever logo_url was null. The asset lives at public/brand/investo-logo.png
-- (served at /brand/investo-logo.png), so this is a plain absolute path, not
-- Supabase Storage — no upload needed for the site's own default branding.
-- trg_audit_branding_changes requires auth.uid() (admin_audit_logs.admin_id
-- is not-null) — there's no authenticated admin in a migration's context,
-- so it's disabled around this one seed update and re-enabled immediately
-- after. Real admin-driven changes through the Branding page keep being
-- audited as before.
alter table branding disable trigger trg_audit_branding_changes;
update branding set logo_url = '/brand/investo-logo.png';
alter table branding enable trigger trg_audit_branding_changes;
