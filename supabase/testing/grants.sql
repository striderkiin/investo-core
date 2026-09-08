-- Run ONCE, immediately after auth_stub.sql and BEFORE any real migration —
-- for local integration testing only. Supabase establishes these grants once
-- at the platform level for every future object in the schema (RLS is what
-- actually restricts row access on top of this); running this before
-- migrations exist (via ALTER DEFAULT PRIVILEGES) rather than after them
-- matters — applying it afterward would silently re-grant anything a
-- migration had deliberately REVOKEd (e.g. complete_sandbox_deposit), which
-- doesn't happen on the real platform and would hide a real permission bug.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;
