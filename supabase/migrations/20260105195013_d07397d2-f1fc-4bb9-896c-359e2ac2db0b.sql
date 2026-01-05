-- Make company_id nullable in locations table to allow standalone location data
ALTER TABLE public.locations ALTER COLUMN company_id DROP NOT NULL;

-- Insert Bangalore locations for the map
INSERT INTO public.locations (address, city, latitude, longitude, company_id) VALUES
  ('Whitefield', 'Bangalore', 12.9698, 77.7499, NULL),
  ('Bellandur', 'Bangalore', 12.9304, 77.6784, NULL),
  ('HSR Layout', 'Bangalore', 12.9116, 77.6389, NULL),
  ('Electronic City', 'Bangalore', 12.8452, 77.6602, NULL),
  ('Yelahanka', 'Bangalore', 13.1007, 77.5963, NULL),
  ('Hebbal', 'Bangalore', 13.0358, 77.5970, NULL),
  ('JP Nagar', 'Bangalore', 12.9077, 77.5850, NULL),
  ('Marathahalli', 'Bangalore', 12.9592, 77.6974, NULL),
  ('Indiranagar', 'Bangalore', 12.9719, 77.6412, NULL);