-- Run AFTER all real migrations, for local integration testing only.
-- Supabase itself grants broad table-level privileges to `authenticated`/`anon`
-- at the platform level (RLS is what actually restricts row access on top of
-- this) — replicate that here since we're not running the real platform.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
