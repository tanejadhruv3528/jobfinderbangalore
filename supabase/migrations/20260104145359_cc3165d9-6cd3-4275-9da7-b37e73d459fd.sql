-- Create profiles table for employer users
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Anyone can view companies
CREATE POLICY "Anyone can view companies"
  ON public.companies FOR SELECT
  USING (true);

-- Only owners can modify their companies
CREATE POLICY "Users can create their own companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies"
  ON public.companies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies"
  ON public.companies FOR DELETE
  USING (auth.uid() = user_id);

-- Create locations table
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Anyone can view locations
CREATE POLICY "Anyone can view locations"
  ON public.locations FOR SELECT
  USING (true);

-- Only company owners can manage locations
CREATE POLICY "Company owners can create locations"
  ON public.locations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.companies 
    WHERE id = company_id AND user_id = auth.uid()
  ));

CREATE POLICY "Company owners can update locations"
  ON public.locations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.companies 
    WHERE id = company_id AND user_id = auth.uid()
  ));

CREATE POLICY "Company owners can delete locations"
  ON public.locations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.companies 
    WHERE id = company_id AND user_id = auth.uid()
  ));

-- Create job_type enum
CREATE TYPE public.job_type AS ENUM ('full-time', 'part-time', 'contract', 'remote');

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  role TEXT NOT NULL,
  experience TEXT,
  salary TEXT,
  job_type public.job_type NOT NULL DEFAULT 'full-time',
  description TEXT,
  apply_url TEXT NOT NULL,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Anyone can view jobs
CREATE POLICY "Anyone can view jobs"
  ON public.jobs FOR SELECT
  USING (true);

-- Only company owners can manage jobs
CREATE POLICY "Company owners can create jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.companies 
    WHERE id = company_id AND user_id = auth.uid()
  ));

CREATE POLICY "Company owners can update jobs"
  ON public.jobs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.companies 
    WHERE id = company_id AND user_id = auth.uid()
  ));

CREATE POLICY "Company owners can delete jobs"
  ON public.jobs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.companies 
    WHERE id = company_id AND user_id = auth.uid()
  ));

-- Create job_sources table
CREATE TABLE public.job_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.job_sources ENABLE ROW LEVEL SECURITY;

-- Anyone can view job sources
CREATE POLICY "Anyone can view job sources"
  ON public.job_sources FOR SELECT
  USING (true);

-- Only job owners can manage sources
CREATE POLICY "Job owners can create sources"
  ON public.job_sources FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.companies c ON j.company_id = c.id
    WHERE j.id = job_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Job owners can delete sources"
  ON public.job_sources FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.companies c ON j.company_id = c.id
    WHERE j.id = job_id AND c.user_id = auth.uid()
  ));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_jobs_company_id ON public.jobs(company_id);
CREATE INDEX idx_jobs_location_id ON public.jobs(location_id);
CREATE INDEX idx_jobs_is_featured ON public.jobs(is_featured);
CREATE INDEX idx_locations_company_id ON public.locations(company_id);
CREATE INDEX idx_locations_coords ON public.locations(latitude, longitude);
CREATE INDEX idx_companies_user_id ON public.companies(user_id);