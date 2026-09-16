-- Adds the light/dark logo variants (public/brand/investo-logo-light.png,
-- investo-logo-dark.png) to the sitewide default branding row. Contexts
-- with a dark background (admin sidebar in dark theme, the public nav's
-- own dark-mode toggle, the always-black public footer, and every
-- client-app dashboard page's dark sidebar) now show the white-tagline
-- dark variant; light-background contexts show the dark-tagline light
-- variant. logo_url itself is left as the plain default for any context
-- that doesn't distinguish.

alter table branding disable trigger trg_audit_branding_changes;
update branding set
  logo_light_url = '/brand/investo-logo-light.png',
  logo_dark_url = '/brand/investo-logo-dark.png';
alter table branding enable trigger trg_audit_branding_changes;
