-- Run the crawler once a day and the re-check agent every 12 hours.
-- pg_cron calls the Edge Functions over HTTP with pg_net. The project URL and the
-- shared secret are read from Supabase Vault at run time, so this migration can be
-- applied before they exist (see supabase/functions/README.md for the two
-- vault.create_secret calls). Until then the jobs run and fail harmlessly.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.invoke_crawler_function(function_name TEXT)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
      || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'crawler_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
$$;

REVOKE ALL ON FUNCTION private.invoke_crawler_function(TEXT) FROM PUBLIC, anon, authenticated;

-- 06:00 IST
SELECT cron.schedule('crawl-jobs-daily', '30 0 * * *',
  $$SELECT private.invoke_crawler_function('crawl-jobs')$$);

-- 07:00 and 19:00 IST
SELECT cron.schedule('recheck-jobs-12h', '30 1,13 * * *',
  $$SELECT private.invoke_crawler_function('recheck-jobs')$$);
