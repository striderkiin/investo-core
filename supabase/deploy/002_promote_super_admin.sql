-- Run this ONCE, after you've created your first admin account through
-- Supabase Dashboard → Authentication → Users → Add User (see README/deploy
-- instructions). The signup trigger creates that user's profile with role
-- 'client' by default; this promotes it to 'super_admin'.
--
-- Replace the email below with the account you just created, then run.

do $$
begin
  perform set_config('app.bypass_profile_guard', 'on', true);
  update profiles set role = 'super_admin' where email = 'YOUR_ADMIN_EMAIL_HERE';
end $$;

-- Verify it worked:
select id, email, role, account_status, referral_code from profiles where email = 'YOUR_ADMIN_EMAIL_HERE';
