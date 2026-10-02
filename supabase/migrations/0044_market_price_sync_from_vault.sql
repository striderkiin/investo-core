-- Schedules the market-price-sync Edge Function (live CoinGecko prices for
-- admin-chosen markets) every 5 minutes, reading this project's URL and anon
-- key from Supabase Vault instead of a value written into the migration.
-- That keeps the migrations reusable for every installation.
--
-- Each installation stores its two values once (see docs/SETUP.md, step 4):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<anon public key>', 'anon_key');
-- Until both exist the job runs but sends nothing.

create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'market-price-sync',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/market-price-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    ),
    body := '{}'::jsonb
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'project_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'anon_key');
  $$
);
