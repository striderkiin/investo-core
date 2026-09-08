-- Run this ONCE, after you've created your first admin account through
-- Supabase Dashboard → Authentication → Users → Add User (see README/deploy
-- instructions). The signup trigger creates that user's profile with role
-- 'client' by default; this promotes it to 'super_admin'.
--
-- IMPORTANT: the email must stay wrapped in single quotes ('...') — it's a
-- text value, not a column name. Replace the email below with your own
-- account if it's not donferris57@gmail.com, keeping the quotes.

do $$
begin
  perform set_config('app.bypass_profile_guard', 'on', true);
  update profiles set role = 'super_admin' where email = 'donferris57@gmail.com';
end $$;

-- Verify it worked:
select id, email, role, account_status, referral_code from profiles where email = 'donferris57@gmail.com';
