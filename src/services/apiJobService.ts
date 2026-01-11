import { Job } from '@/types';

interface ApiJob {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  apply_url: string;
}

export const fetchJobsFromApi = async (): Promise<Job[]> => {
  const response = await fetch('http://localhost:4000/api/jobs');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch jobs: ${response.statusText}`);
  }

  const data: ApiJob[] = await response.json();

  return data.map((job, index) => ({
    id: job.id,
    companyId: job.id, // Use job id as placeholder
    locationId: job.id, // Use job id as location id for pin synchronization
    title: job.title,
    role: 'General', // Default role since API doesn't provide
    experience: '',
    salary: '',
    jobType: 'full-time' as const,
    description: job.description || '',
    applyUrl: job.apply_url,
    isFeatured: index < 3, // Mark first 3 as featured
    createdAt: new Date().toISOString(),
    location: {
      id: job.id,
      companyId: null,
      address: '',
      city: 'Bangalore',
      latitude: job.latitude,
      longitude: job.longitude,
    },
  }));
};
