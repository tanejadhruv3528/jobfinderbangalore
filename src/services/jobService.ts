import { supabase } from '@/integrations/supabase/client';
import { Job, Company, Location } from '@/types';

export const fetchJobs = async (): Promise<Job[]> => {
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      company:companies(*),
      location:locations(*)
    `)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching jobs:', error);
    throw error;
  }

  return (data || []).map(job => ({
    id: job.id,
    companyId: job.company_id,
    locationId: job.location_id,
    title: job.title,
    role: job.role,
    experience: job.experience || '',
    salary: job.salary || '',
    jobType: job.job_type as Job['jobType'],
    description: job.description || '',
    applyUrl: job.apply_url,
    isFeatured: job.is_featured,
    createdAt: job.created_at,
    company: job.company ? {
      id: job.company.id,
      name: job.company.name,
      industry: job.company.industry || '',
      website: job.company.website || '',
      logo: job.company.logo_url,
    } : undefined,
    location: job.location ? {
      id: job.location.id,
      companyId: job.location.company_id,
      address: job.location.address,
      city: job.location.city,
      latitude: Number(job.location.latitude),
      longitude: Number(job.location.longitude),
    } : undefined,
  }));
};

export const fetchCompanies = async (userId?: string): Promise<Company[]> => {
  let query = supabase.from('companies').select('*');
  
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching companies:', error);
    throw error;
  }

  return (data || []).map(company => ({
    id: company.id,
    name: company.name,
    industry: company.industry || '',
    website: company.website || '',
    logo: company.logo_url,
  }));
};

export const fetchLocations = async (companyId?: string): Promise<Location[]> => {
  let query = supabase.from('locations').select('*');
  
  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching locations:', error);
    throw error;
  }

  return (data || []).map(location => ({
    id: location.id,
    companyId: location.company_id,
    address: location.address,
    city: location.city,
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
  }));
};

export const createCompany = async (company: {
  name: string;
  industry?: string;
  website?: string;
  logo_url?: string;
  user_id: string;
}) => {
  const { data, error } = await supabase
    .from('companies')
    .insert(company)
    .select()
    .single();

  if (error) {
    console.error('Error creating company:', error);
    throw error;
  }

  return data;
};

export const createLocation = async (location: {
  company_id: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
}) => {
  const { data, error } = await supabase
    .from('locations')
    .insert(location)
    .select()
    .single();

  if (error) {
    console.error('Error creating location:', error);
    throw error;
  }

  return data;
};

export const createJob = async (job: {
  company_id: string;
  location_id: string;
  title: string;
  role: string;
  experience?: string;
  salary?: string;
  job_type: 'full-time' | 'part-time' | 'contract' | 'remote';
  description?: string;
  apply_url: string;
  is_featured?: boolean;
}) => {
  const { data, error } = await supabase
    .from('jobs')
    .insert(job)
    .select()
    .single();

  if (error) {
    console.error('Error creating job:', error);
    throw error;
  }

  return data;
};

export const updateJob = async (jobId: string, updates: Partial<{
  title: string;
  role: string;
  experience: string;
  salary: string;
  job_type: 'full-time' | 'part-time' | 'contract' | 'remote';
  description: string;
  apply_url: string;
  is_featured: boolean;
}>) => {
  const { data, error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', jobId)
    .select()
    .single();

  if (error) {
    console.error('Error updating job:', error);
    throw error;
  }

  return data;
};

export const deleteJob = async (jobId: string) => {
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId);

  if (error) {
    console.error('Error deleting job:', error);
    throw error;
  }
};

export const fetchUserJobs = async (userId: string): Promise<Job[]> => {
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      company:companies!inner(*),
      location:locations(*)
    `)
    .eq('companies.user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user jobs:', error);
    throw error;
  }

  return (data || []).map(job => ({
    id: job.id,
    companyId: job.company_id,
    locationId: job.location_id,
    title: job.title,
    role: job.role,
    experience: job.experience || '',
    salary: job.salary || '',
    jobType: job.job_type as Job['jobType'],
    description: job.description || '',
    applyUrl: job.apply_url,
    isFeatured: job.is_featured,
    createdAt: job.created_at,
    company: job.company ? {
      id: job.company.id,
      name: job.company.name,
      industry: job.company.industry || '',
      website: job.company.website || '',
      logo: job.company.logo_url,
    } : undefined,
    location: job.location ? {
      id: job.location.id,
      companyId: job.location.company_id,
      address: job.location.address,
      city: job.location.city,
      latitude: Number(job.location.latitude),
      longitude: Number(job.location.longitude),
    } : undefined,
  }));
};
