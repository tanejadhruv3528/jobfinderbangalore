import { Job } from '@/types';
import { jobsApi, ApiJob } from './api';

// Transform API job to frontend Job type
const transformJob = (job: ApiJob, index: number): Job => ({
  id: job.id,
  companyId: job.id,
  locationId: job.id,
  title: job.title,
  role: 'General',
  experience: '',
  salary: '',
  jobType: 'full-time' as const,
  description: job.description || '',
  applyUrl: job.apply_url,
  isFeatured: index < 3,
  createdAt: job.created_at || new Date().toISOString(),
  company: job.company_name ? { 
    id: job.id, 
    name: job.company_name, 
    industry: '', 
    website: '', 
    logo: '' 
  } : undefined,
  location: {
    id: job.id,
    companyId: null,
    address: job.location_address || '',
    city: 'Bangalore',
    latitude: job.latitude,
    longitude: job.longitude,
  },
});

export const fetchJobsFromApi = async (): Promise<Job[]> => {
  const data = await jobsApi.getAll();
  return data.map((job, index) => transformJob(job, index));
};

export const fetchMyJobs = async (): Promise<Job[]> => {
  const data = await jobsApi.getMyJobs();
  return data.map((job, index) => transformJob(job, index));
};

export const createJob = async (job: {
  title: string;
  description: string;
  maps_url: string;
  apply_url: string;
}): Promise<Job> => {
  const data = await jobsApi.create(job);
  return transformJob(data, 0);
};

export const deleteJob = async (jobId: string): Promise<void> => {
  await jobsApi.delete(jobId);
};
