select vault.create_secret('https://vrquxovkptfigrjsmhng.supabase.co', 'project_url');
select vault.create_secret('IDE_A_SUPABASE_PUBLISHABLE_VAGY_ANON_KULCSOD', 'anon_key');

select cron.schedule(
  'news-ingest-every-10-minutes',
  '*/10 * * * *',
  $$
  select
    net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/news-ingest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
