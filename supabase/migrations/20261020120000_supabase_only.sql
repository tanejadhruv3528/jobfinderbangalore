-- JobPins: move from the Express API to Supabase Auth + row-level security.
-- Runs on the "Job Pins V2" project (jaovcgfdgksjjvbjjsne).
-- The old Express tables are kept as legacy_* so their data can be migrated
-- in a follow-up once the project is unpaused and the rows have been checked.

ALTER TABLE IF EXISTS public.jobs RENAME TO legacy_jobs;
ALTER TABLE IF EXISTS public.employers RENAME TO legacy_employers;
ALTER TABLE IF EXISTS public.legacy_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.legacy_employers ENABLE ROW LEVEL SECURITY;
-- No policies on legacy tables: they are unreachable through the public API.

-- Employer profile, one per auth user
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL CHECK (char_length(company_name) BETWEEN 1 AND 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Employers can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, company_name)
  VALUES (new.id, COALESCE(NULLIF(trim(new.raw_user_meta_data ->> 'company_name'), ''), 'Unnamed company'));
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Jobs
CREATE TYPE public.job_type AS ENUM ('full-time', 'part-time', 'contract', 'internship');

CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL CHECK (char_length(company_name) BETWEEN 1 AND 120),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 5000),
  area TEXT CHECK (char_length(area) <= 120),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  apply_url TEXT NOT NULL CHECK (apply_url ~* '^https?://'),
  job_type public.job_type NOT NULL DEFAULT 'full-time',
  salary TEXT CHECK (char_length(salary) <= 60),
  experience TEXT CHECK (char_length(experience) <= 60),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_employer_id ON public.jobs(employer_id);
CREATE INDEX idx_jobs_created_at ON public.jobs(created_at DESC);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view jobs"
  ON public.jobs FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Employers can post their own jobs"
  ON public.jobs FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = employer_id AND is_featured = false);

CREATE POLICY "Employers can delete their own jobs"
  ON public.jobs FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = employer_id);

-- is_featured is set by an admin only (no UPDATE policy for employers)
