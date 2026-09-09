-- migration 0021: schedules market_provider_tick() via pg_cron so the Live
-- Provider price keeps moving even when no browser tab is open (previously
-- it only ticked from a client-side setInterval). Run AFTER 008.
--
-- Note: pg_cron must be enabled for your project. This statement enables it,
-- but on some plans it may need to be turned on first via
-- Dashboard -> Database -> Extensions -> pg_cron.

create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'market-provider-tick',
  '* * * * *',
  $$select public.market_provider_tick();$$
);
