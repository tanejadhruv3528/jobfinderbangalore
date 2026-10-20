import type { JobType } from '@/integrations/supabase/types';

export interface Company {
  id: string;
  name: string;
  industry: string;
  website: string;
  logo?: string;
}

export interface Location {
  id: string;
  companyId: string | null;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface Job {
  id: string;
  companyId: string;
  locationId: string;
  title: string;
  role: string;
  experience: string;
  salary: string;
  jobType: JobType;
  description: string;
  applyUrl: string;
  isFeatured: boolean;
  createdAt: string;
  company?: Company;
  location?: Location;
}

export interface JobSource {
  jobId: string;
  sourceType: string;
  sourceUrl: string;
}

export interface FilterState {
  distance: number;
  role: string;
  jobType: string;
  searchQuery: string;
}

export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}
