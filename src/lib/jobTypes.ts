import type { JobType } from '@/integrations/supabase/types';

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
};

export const JOB_TYPES = Object.keys(JOB_TYPE_LABELS) as JobType[];
