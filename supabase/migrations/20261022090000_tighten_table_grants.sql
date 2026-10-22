-- Tighten what the public API roles can do at the grant level, under RLS.
-- Supabase gives anon and authenticated every privilege on new public tables
-- by default; RLS was the only thing stopping writes. This keeps exactly what
-- the site uses:
--   anon           read active jobs
--   authenticated  read jobs, post a job (only the form's columns), delete own
--                  jobs, read and rename own profile
-- Employers could previously set created_at (to pin a job at the top of
-- "Newest" forever), status, source fields and last_seen_at on insert.

-- Crawler-only tables: the Edge Functions use the service role, which keeps its grants
REVOKE ALL ON public.crawl_queries, public.crawl_runs, public.company_locations FROM anon, authenticated;

-- Jobs
REVOKE ALL ON public.jobs FROM anon, authenticated;
GRANT SELECT ON public.jobs TO anon, authenticated;
GRANT DELETE ON public.jobs TO authenticated;
GRANT INSERT (
  employer_id, company_name, title, description, area, latitude, longitude,
  apply_url, job_type, salary, experience
) ON public.jobs TO authenticated;

-- Profiles are created by the signup trigger and only ever renamed
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (company_name) ON public.profiles TO authenticated;
