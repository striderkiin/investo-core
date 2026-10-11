-- Site Admin: the role a hosted buyer gets on their own site. It can do
-- everything a super admin can except manage admins: no Admins page, no
-- invites and no role changes. Admins for hosted sites are added from HQ.

-- Enum values can't be used in the transaction that adds them, so this runs first.
alter type role_name add value if not exists 'site_admin';
