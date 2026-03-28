-- Fix: Restrict job_sources SELECT to only authenticated job owners (prevents email harvesting)
DROP POLICY IF EXISTS "Anyone can view job sources" ON public.job_sources;

CREATE POLICY "Job owners can view sources"
  ON public.job_sources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN companies c ON j.company_id = c.id
      WHERE j.id = job_sources.job_id 
      AND c.user_id = auth.uid()
    )
  );