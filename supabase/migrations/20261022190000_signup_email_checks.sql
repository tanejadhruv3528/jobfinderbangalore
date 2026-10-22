-- Block sign-ups from temporary (disposable) email addresses and from
-- aliases of an existing account (Gmail dots, googlemail.com, +tags).
--
-- The rules live in the database, so they hold even if someone calls the
-- Supabase Auth API directly. The site calls public.check_signup_email first
-- so it can show a friendly message before trying to create the account.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.disposable_email_domains (
  domain text PRIMARY KEY
);

-- A few of the most common services, so blocking works before the first refresh
INSERT INTO private.disposable_email_domains (domain) VALUES
  ('mailinator.com'), ('guerrillamail.com'), ('guerrillamail.net'), ('sharklasers.com'),
  ('10minutemail.com'), ('yopmail.com'), ('tempmail.com'), ('temp-mail.org'), ('temp-mail.io'),
  ('tempmailo.com'), ('throwawaymail.com'), ('getnada.com'), ('nada.email'), ('maildrop.cc'),
  ('dispostable.com'), ('trashmail.com'), ('fakeinbox.com'), ('mailnesia.com'), ('mintemail.com'),
  ('mohmal.com'), ('emailondeck.com'), ('tempinbox.com'), ('spamgourmet.com'), ('mailcatch.com'),
  ('moakt.com'), ('tempr.email'), ('discard.email'), ('burnermail.io'), ('1secmail.com'),
  ('1secmail.org'), ('1secmail.net'), ('mail.tm'), ('inboxkitten.com'), ('emailfake.com')
ON CONFLICT DO NOTHING;

-- The full list (about 10,000 domains) comes from the community-maintained
-- github.com/disposable-email-domains list and is refreshed daily by pg_cron.
-- pg_net is asynchronous, so each run loads the previous run's download and
-- then starts the next one.
CREATE TABLE IF NOT EXISTS private.disposable_list_fetch (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  request_id bigint,
  loaded_at timestamptz,
  domain_count int
);

CREATE OR REPLACE FUNCTION private.refresh_disposable_domains()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  pending bigint;
  body text;
  n int;
BEGIN
  SELECT request_id INTO pending FROM private.disposable_list_fetch WHERE id = 1;

  IF pending IS NOT NULL THEN
    SELECT content INTO body FROM net._http_response WHERE id = pending AND status_code = 200;
    -- Only trust a download that looks like the real list
    IF body IS NOT NULL AND length(body) > 50000 THEN
      INSERT INTO private.disposable_email_domains (domain)
      SELECT DISTINCT lower(trim(line))
      FROM regexp_split_to_table(body, E'\n') AS line
      WHERE trim(line) ~ '^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
      ON CONFLICT DO NOTHING;
      SELECT count(*) INTO n FROM private.disposable_email_domains;
      UPDATE private.disposable_list_fetch SET loaded_at = now(), domain_count = n WHERE id = 1;
    END IF;
  END IF;

  INSERT INTO private.disposable_list_fetch (id, request_id)
  VALUES (1, net.http_get('https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf'))
  ON CONFLICT (id) DO UPDATE SET request_id = excluded.request_id;
END;
$$;

-- Daily at 03:15 IST
SELECT cron.unschedule('refresh-disposable-email-domains')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-disposable-email-domains');
SELECT cron.schedule('refresh-disposable-email-domains', '45 21 * * *', 'SELECT private.refresh_disposable_domains()');

-- One canonical form per mailbox: lower case, no +tag, and for Gmail no dots
-- and googlemail.com folded into gmail.com
CREATE OR REPLACE FUNCTION private.canonical_email(email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  WITH parts AS (
    SELECT split_part(lower(trim(email)), '@', 1) AS local_part,
           CASE split_part(lower(trim(email)), '@', 2)
             WHEN 'googlemail.com' THEN 'gmail.com'
             ELSE split_part(lower(trim(email)), '@', 2)
           END AS domain
  )
  SELECT CASE WHEN domain = 'gmail.com'
              THEN replace(split_part(local_part, '+', 1), '.', '')
              ELSE split_part(local_part, '+', 1)
         END || '@' || domain
  FROM parts;
$$;

-- True for a listed domain or any subdomain of one (x.mailinator.com)
CREATE OR REPLACE FUNCTION private.is_disposable_email(email text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH labels AS (
    SELECT string_to_array(split_part(lower(trim(email)), '@', 2), '.') AS a
  )
  SELECT EXISTS (
    SELECT 1
    FROM labels, generate_series(1, greatest(array_length(a, 1) - 1, 0)) AS i
    JOIN private.disposable_email_domains d ON d.domain = array_to_string(a[i:], '.')
  );
$$;

CREATE OR REPLACE FUNCTION private.email_taken(email text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE private.canonical_email(u.email) = private.canonical_email(email)
  );
$$;

-- Called by the sign-up form: 'invalid', 'disposable', 'taken' or 'ok'
CREATE OR REPLACE FUNCTION public.check_signup_email(email text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF email IS NULL OR length(email) > 254 OR trim(email) !~* '^[^@\s]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$' THEN
    RETURN 'invalid';
  END IF;
  IF private.is_disposable_email(email) THEN
    RETURN 'disposable';
  END IF;
  IF private.email_taken(email) THEN
    RETURN 'taken';
  END IF;
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.check_signup_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_signup_email(text) TO anon, authenticated;

-- The hard stop: runs inside Supabase Auth's own insert
CREATE OR REPLACE FUNCTION private.block_unwanted_signups()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF private.is_disposable_email(NEW.email) THEN
    RAISE EXCEPTION 'Temporary email addresses are not allowed' USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id <> NEW.id AND private.canonical_email(u.email) = private.canonical_email(NEW.email)
  ) THEN
    RAISE EXCEPTION 'An account with this email already exists' USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_unwanted_signups ON auth.users;
CREATE TRIGGER block_unwanted_signups
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.block_unwanted_signups();

-- Start the first download now; the next daily run (or a manual call) loads it
SELECT private.refresh_disposable_domains();
