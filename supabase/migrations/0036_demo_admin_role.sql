-- Demo admin: a shareable admin account for people trying out the panel.
-- It can use every day-to-day admin feature but cannot touch the platform's
-- keys and controls: integrations/API keys, admin accounts and roles,
-- security, settings, environment, branding/white label or treasury wallets.
--
-- Also: only a super admin may edit or adjust another admin's account, so a
-- shared demo login (or any non-super admin) can't suspend or rename the owner.

-- Enum values can't be used in the transaction that adds them, so this runs first.
alter type role_name add value if not exists 'demo_admin';
