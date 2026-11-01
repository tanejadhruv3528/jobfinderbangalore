-- LinkedIn jobs through Bright Data's LinkedIn Jobs API, replacing the Google Jobs
-- crawl. Bright Data collects public LinkedIn job pages; JobPins never contacts
-- LinkedIn itself. Discovery is asynchronous: the 06:00 IST crawl starts a
-- Bright Data snapshot and the follow-up runs download it once it's ready.
-- Existing google_jobs rows stay and expire on their own through the re-check rules.

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_source_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_source_check CHECK (source IN ('employer', 'google_jobs', 'linkedin'));

-- One row per Bright Data discovery request.
CREATE TABLE public.linkedin_snapshots (
  snapshot_id TEXT PRIMARY KEY CHECK (char_length(snapshot_id) <= 100),
  queries TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Set once the snapshot is processed, failed, or given up on
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  records INTEGER,
  error TEXT CHECK (char_length(error) <= 500)
);

-- Service role only (the Edge Functions)
ALTER TABLE public.linkedin_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.linkedin_snapshots FROM anon, authenticated;

-- Collect the snapshot started at 06:00 IST: 06:30, 07:30 and 08:30 IST.
-- A run with nothing pending and a snapshot already started today does only
-- the Maps office lookups, so the extra runs cost no Bright Data records.
SELECT cron.schedule('crawl-jobs-collect', '0 1,2,3 * * *',
  $$SELECT private.invoke_crawler_function('crawl-jobs')$$);
