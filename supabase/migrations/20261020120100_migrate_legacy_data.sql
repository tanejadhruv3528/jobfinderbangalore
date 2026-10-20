-- Copy Express-era employers and jobs into Supabase Auth + the new tables.
-- Passwords keep working: the legacy bcrypt hashes are stored as-is.
-- Safe to re-run: employers already linked are skipped.

ALTER TABLE public.legacy_employers ADD COLUMN IF NOT EXISTS auth_user_id UUID;

UPDATE public.legacy_employers
SET auth_user_id = gen_random_uuid()
WHERE auth_user_id IS NULL;

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000', e.auth_user_id, 'authenticated', 'authenticated',
  lower(e.email), e.password_hash, now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('company_name', e.company_name),
  COALESCE(e.created_at, now()), now(),
  '', '', '', ''
FROM public.legacy_employers e
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = e.auth_user_id OR lower(u.email) = lower(e.email));

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT
  u.id::text, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), u.created_at, now()
FROM auth.users u
JOIN public.legacy_employers e ON e.auth_user_id = u.id
WHERE NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email');

-- Profiles are created by the on_auth_user_created trigger.

INSERT INTO public.jobs (employer_id, company_name, title, description, latitude, longitude, apply_url, created_at)
SELECT
  e.auth_user_id, e.company_name, j.title, j.description,
  j.latitude::double precision, j.longitude::double precision, j.apply_url,
  COALESCE(j.created_at, now())
FROM public.legacy_jobs j
JOIN public.legacy_employers e ON e.id = j.employer_id
JOIN auth.users u ON u.id = e.auth_user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.jobs n
  WHERE n.employer_id = e.auth_user_id AND n.title = j.title AND n.created_at = COALESCE(j.created_at, now())
);
