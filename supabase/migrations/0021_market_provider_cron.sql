-- The Live Provider heartbeat (market_provider_tick(), added in 0017) has
-- only ever been driven by a client-side setInterval in useMarketProvider.ts
-- (every 4s, while an admin/client dashboard happens to be open in a
-- browser tab). Its own comment promises "always ticking, independent of
-- override state" — that promise breaks the moment nobody has the app open.
--
-- pg_cron is the natural fix here: it ships with Supabase (no extra
-- service, no extra cost, no separate infra to babysit), and can call a
-- SQL function directly with no HTTP round-trip. Its native scheduling
-- granularity is 1 minute (5-field cron, no seconds), so this is a coarser
-- *floor* under the existing fast client-side tick, not a replacement for
-- it — the UI still animates every 4s whenever someone's watching; this
-- guarantees the price keeps moving even when nobody is.

create extension if not exists pg_cron with schema extensions;

-- cron.schedule() upserts by job name, so re-running this migration is safe.
select cron.schedule(
  'market-provider-tick',
  '* * * * *',
  $$select public.market_provider_tick();$$
);
