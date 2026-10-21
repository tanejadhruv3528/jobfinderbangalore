-- Crawled jobs: let the Google Jobs crawler write into public.jobs next to
-- employer posts, and give the re-check agent somewhere to record what it found.
-- Runs after 20261020120000_supabase_only.sql.

-- Crawled jobs have no employer account.
ALTER TABLE public.jobs ALTER COLUMN employer_id DROP NOT NULL;

CREATE TYPE public.job_status AS ENUM ('active', 'expired');

ALTER TABLE public.jobs
  ADD COLUMN source TEXT NOT NULL DEFAULT 'employer' CHECK (source IN ('employer', 'google_jobs')),
  -- Stable dedupe key for crawled jobs (hash of company + title)
  ADD COLUMN external_id TEXT CHECK (char_length(external_id) <= 128),
  -- Board the listing came from, e.g. "LinkedIn" or "Naukri"
  ADD COLUMN source_via TEXT CHECK (char_length(source_via) <= 120),
  -- How good the map pin is: employer-picked, area centroid, or company geocode
  ADD COLUMN location_precision TEXT NOT NULL DEFAULT 'exact'
    CHECK (location_precision IN ('exact', 'area', 'company')),
  ADD COLUMN status public.job_status NOT NULL DEFAULT 'active',
  ADD COLUMN expired_reason TEXT CHECK (char_length(expired_reason) <= 120),
  -- Last time the crawler saw the listing on Google
  ADD COLUMN last_seen_at TIMESTAMPTZ,
  -- Last time the re-check agent opened the apply link
  ADD COLUMN last_checked_at TIMESTAMPTZ,
  ADD CONSTRAINT jobs_owner_matches_source CHECK ((source = 'employer') = (employer_id IS NOT NULL)),
  ADD CONSTRAINT jobs_crawled_have_external_id CHECK (source = 'employer' OR external_id IS NOT NULL);

CREATE UNIQUE INDEX jobs_source_external_id_key ON public.jobs(source, external_id);
CREATE INDEX idx_jobs_recheck ON public.jobs(last_checked_at NULLS FIRST)
  WHERE source <> 'employer' AND status = 'active';

-- Expired jobs stay in the table for history but drop off the public map.
-- Employers still see all of their own jobs.
ALTER POLICY "Anyone can view jobs" ON public.jobs
  USING (status = 'active' OR (SELECT auth.uid()) = employer_id);
ALTER POLICY "Anyone can view jobs" ON public.jobs RENAME TO "Anyone can view active jobs";

-- Search terms the crawler runs against Google Jobs, oldest first.
-- Add or disable rows here instead of redeploying.
CREATE TABLE public.crawl_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL UNIQUE CHECK (char_length(query) BETWEEN 2 AND 120),
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per crawler or re-check run, for debugging and cost tracking.
CREATE TABLE public.crawl_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('crawl', 'recheck')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT
);

-- Service role only (the Edge Functions); nothing is exposed to the public key.
ALTER TABLE public.crawl_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_runs ENABLE ROW LEVEL SECURITY;

INSERT INTO public.crawl_queries (query) VALUES
  ('software engineer'),
  ('full stack developer'),
  ('frontend developer'),
  ('backend developer'),
  ('android developer'),
  ('data analyst'),
  ('data scientist'),
  ('machine learning engineer'),
  ('devops engineer'),
  ('QA engineer'),
  ('product manager'),
  ('UI UX designer'),
  ('graphic designer'),
  ('digital marketing'),
  ('content writer'),
  ('sales executive'),
  ('business development executive'),
  ('customer support'),
  ('HR recruiter'),
  ('accountant'),
  ('operations executive'),
  ('internship'),
  ('fresher');
