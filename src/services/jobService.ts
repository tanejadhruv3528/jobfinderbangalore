import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Job } from '@/types';

type JobRow = Database['public']['Tables']['jobs']['Row'];

// Transform a database row to the frontend Job type
const transformJob = (job: JobRow): Job => ({
  id: job.id,
  companyId: job.employer_id ?? '',
  locationId: job.id,
  title: job.title,
  role: 'General',
  experience: job.experience || '',
  salary: job.salary || '',
  jobType: job.job_type,
  description: job.description,
  applyUrl: job.apply_url,
  isFeatured: job.is_featured,
  createdAt: job.created_at,
  company: {
    id: job.employer_id ?? '',
    name: job.company_name,
    industry: '',
    website: '',
    logo: '',
  },
  location: {
    id: job.id,
    companyId: job.employer_id,
    address: job.area || '',
    city: 'Bangalore',
    latitude: job.latitude,
    longitude: job.longitude,
  },
});

export const fetchJobs = async (): Promise<Job[]> => {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data.map(transformJob);
};

export const fetchMyJobs = async (employerId: string): Promise<Job[]> => {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data.map(transformJob);
};

export const createJob = async (job: {
  employerId: string;
  companyName: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  applyUrl: string;
}): Promise<Job> => {
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      employer_id: job.employerId,
      company_name: job.companyName,
      title: job.title,
      description: job.description,
      latitude: job.latitude,
      longitude: job.longitude,
      apply_url: job.applyUrl,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return transformJob(data);
};

export const deleteJob = async (jobId: string): Promise<void> => {
  const { error, count } = await supabase
    .from('jobs')
    .delete({ count: 'exact' })
    .eq('id', jobId);

  if (error) throw new Error(error.message);
  if (count === 0) throw new Error('Job not found or not yours to delete');
};
