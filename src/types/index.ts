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

export type SortOrder = 'nearest' | 'newest';

export interface FilterState {
  /** Commute mode used for the reach filter and time estimates */
  mode: 'walk' | 'bike' | 'car';
  /** Max commute in minutes from home; 0 means anywhere in the city */
  maxMinutes: number;
  jobType: JobType | 'all';
  searchQuery: string;
  sort: SortOrder;
}

export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}
