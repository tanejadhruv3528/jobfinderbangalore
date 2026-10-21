-- Pin crawled jobs at the company's office found on Google Maps.
-- A crawled job whose listing names no area is saved with location_precision
-- 'city' (a placeholder pin at the city centre) and hidden from the site until
-- the crawler has looked its company up on Google Maps.

ALTER TABLE public.jobs DROP CONSTRAINT jobs_location_precision_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_location_precision_check
  CHECK (location_precision IN ('exact', 'area', 'company', 'city'));

ALTER POLICY "Anyone can view active jobs" ON public.jobs
  USING ((status = 'active' AND location_precision <> 'city') OR (SELECT auth.uid()) = employer_id);

CREATE INDEX idx_jobs_awaiting_pin ON public.jobs(company_name)
  WHERE location_precision = 'city' AND status = 'active';

-- One Google Maps lookup per company, reused for all its jobs.
CREATE TABLE public.company_locations (
  company_key TEXT PRIMARY KEY CHECK (char_length(company_key) BETWEEN 1 AND 120),
  found BOOLEAN NOT NULL,
  latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
  looked_up_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (NOT found OR (latitude IS NOT NULL AND longitude IS NOT NULL))
);

-- Service role only (the Edge Functions)
ALTER TABLE public.company_locations ENABLE ROW LEVEL SECURITY;
