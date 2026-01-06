-- First, drop the existing policy that was partially created
DROP POLICY IF EXISTS "Allow seed company inserts" ON public.companies;

-- Make user_id nullable for seed data purposes
ALTER TABLE public.companies ALTER COLUMN user_id DROP NOT NULL;

-- Drop the foreign key constraint on user_id
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_user_id_fkey;

-- Insert dummy companies for V1 testing (without user_id)
INSERT INTO public.companies (id, user_id, name, industry, website, logo_url) VALUES
  ('c1000001-0000-0000-0000-000000000001', NULL, 'TechServe Solutions', 'Technology', 'https://example.com', NULL),
  ('c1000001-0000-0000-0000-000000000002', NULL, 'GrowthPro Consulting', 'Consulting', 'https://example.com', NULL),
  ('c1000001-0000-0000-0000-000000000003', NULL, 'BuildRight Infra', 'Construction', 'https://example.com', NULL),
  ('c1000001-0000-0000-0000-000000000004', NULL, 'SwiftLogix', 'Logistics', 'https://example.com', NULL),
  ('c1000001-0000-0000-0000-000000000005', NULL, 'PeopleFirst HR', 'Human Resources', 'https://example.com', NULL);

-- Insert 10 dummy Bangalore jobs linked to existing locations
INSERT INTO public.jobs (company_id, location_id, title, role, experience, job_type, salary, description, apply_url, is_featured) VALUES
  -- 1. Sales Executive - Whitefield
  ('c1000001-0000-0000-0000-000000000001', '6e1ded02-dc84-400e-a762-8f7b98cfbd6b', 'Sales Executive', 'Sales', '1-3 years', 'full-time', '₹3-5 LPA', 'Responsible for identifying potential clients, managing sales pipelines, and achieving monthly targets. Good communication skills required.', 'https://example.com/apply', false),
  
  -- 2. Customer Support Executive - Bellandur
  ('c1000001-0000-0000-0000-000000000002', '5d04c031-dc64-4c43-9a1d-c062c04058e0', 'Customer Support Executive', 'Support', '0-2 years', 'full-time', '₹2.5-4 LPA', 'Handle customer queries via phone and email. Resolve issues promptly and maintain customer satisfaction records.', 'https://example.com/apply', false),
  
  -- 3. Digital Marketing Executive - HSR Layout
  ('c1000001-0000-0000-0000-000000000001', 'a2407f1f-e2b7-4112-82fb-6266fac3080b', 'Digital Marketing Executive', 'Marketing', '1-4 years', 'full-time', '₹4-6 LPA', 'Manage social media campaigns, SEO optimization, and digital advertising. Experience with Google Ads and Meta Ads preferred.', 'https://example.com/apply', true),
  
  -- 4. Site Supervisor - Electronic City
  ('c1000001-0000-0000-0000-000000000003', '70859bfa-18f3-4f71-ade9-35525b59e850', 'Site Supervisor', 'Operations', '3-5 years', 'full-time', '₹4-6 LPA', 'Oversee construction site operations, manage labor teams, ensure quality and safety standards are met.', 'https://example.com/apply', false),
  
  -- 5. Operations Manager - Hebbal
  ('c1000001-0000-0000-0000-000000000003', 'fcd3f874-65b4-4816-abfc-1fc9fa6befdc', 'Operations Manager', 'Operations', '4-7 years', 'full-time', '₹6-10 LPA', 'Lead operations team, optimize processes, manage vendor relationships, and ensure timely project delivery.', 'https://example.com/apply', true),
  
  -- 6. Delivery Coordinator - Yelahanka (shift-based mapped to part-time)
  ('c1000001-0000-0000-0000-000000000004', '80083b3f-9a19-4aff-8736-c93549ffdeda', 'Delivery Coordinator', 'Logistics', '0-2 years', 'part-time', '₹2-3.5 LPA', 'Coordinate delivery schedules, track shipments, and communicate with drivers and customers for timely deliveries.', 'https://example.com/apply', false),
  
  -- 7. HR Recruiter - JP Nagar
  ('c1000001-0000-0000-0000-000000000005', 'c7dd5f00-f6e3-42f3-9e2e-7644efba0451', 'HR Recruiter', 'HR', '2-4 years', 'full-time', '₹4-6 LPA', 'Source candidates, conduct interviews, manage hiring pipelines, and coordinate onboarding processes.', 'https://example.com/apply', false),
  
  -- 8. Accounts Executive - Marathahalli
  ('c1000001-0000-0000-0000-000000000002', 'b0af9367-d294-44b8-a361-720c1b81e361', 'Accounts Executive', 'Finance', '1-3 years', 'full-time', '₹3-5 LPA', 'Manage accounts payable/receivable, prepare financial reports, and assist with audits. Tally knowledge required.', 'https://example.com/apply', false),
  
  -- 9. Business Development Executive - Indiranagar
  ('c1000001-0000-0000-0000-000000000001', '43920faa-c38c-47b2-93a0-052228db7385', 'Business Development Executive', 'Sales', '1-3 years', 'full-time', '₹3-5 LPA', 'Identify new business opportunities, build client relationships, and contribute to revenue growth targets.', 'https://example.com/apply', false),
  
  -- 10. Office Administrator - Whitefield
  ('c1000001-0000-0000-0000-000000000002', '6e1ded02-dc84-400e-a762-8f7b98cfbd6b', 'Office Administrator', 'Administration', '1-3 years', 'full-time', '₹3-4.5 LPA', 'Manage office operations, coordinate meetings, handle correspondence, and maintain office supplies inventory.', 'https://example.com/apply', false);