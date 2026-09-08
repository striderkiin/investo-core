-- Phase 1/4/5 (spec section 74): enable Realtime for the tables the client
-- actually subscribes to — deposit/withdrawal status, notifications, support
-- messages, and live market data/settings. Idempotent: safe to run even if
-- some of these are already published.

do $$
declare
  t text;
begin
  foreach t in array array['notifications', 'support_messages', 'deposits', 'withdrawals', 'market_settings', 'market_data'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
