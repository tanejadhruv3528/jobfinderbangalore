import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple geocoding for Bangalore addresses using Nominatim
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = `${address}, Bangalore, Karnataka, India`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'JobPins/1.0'
      }
    });
    
    if (!response.ok) {
      console.error('Geocoding request failed:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    
    // Default to central Bangalore if geocoding fails
    return { lat: 12.9716, lng: 77.5946 };
  } catch (error) {
    console.error('Geocoding error:', error);
    // Default to central Bangalore
    return { lat: 12.9716, lng: 77.5946 };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { companyName, jobTitle, jobDescription, jobLocation, applyUrl, contactEmail } = body;

    // Validate required fields
    if (!companyName || !jobTitle || !jobDescription || !jobLocation || !applyUrl || !contactEmail) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format
    try {
      new URL(applyUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid apply URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Geocode the address
    const coords = await geocodeAddress(jobLocation);
    if (!coords) {
      return new Response(
        JSON.stringify({ error: 'Could not determine location. Please provide a more specific address.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create company (without user_id for anonymous posting)
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName.trim().substring(0, 100),
        industry: 'General',
        website: null,
        logo_url: null,
        user_id: null,
      })
      .select()
      .single();

    if (companyError) {
      console.error('Company creation error:', companyError);
      return new Response(
        JSON.stringify({ error: 'Failed to create company record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create location
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .insert({
        company_id: company.id,
        address: jobLocation.trim().substring(0, 200),
        city: 'Bangalore',
        latitude: coords.lat,
        longitude: coords.lng,
      })
      .select()
      .single();

    if (locationError) {
      console.error('Location creation error:', locationError);
      // Clean up company if location fails
      await supabase.from('companies').delete().eq('id', company.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create location record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        company_id: company.id,
        location_id: location.id,
        title: jobTitle.trim().substring(0, 100),
        role: 'General',
        experience: null,
        salary: null,
        job_type: 'full-time',
        description: jobDescription.trim().substring(0, 5000),
        apply_url: applyUrl.trim(),
        is_featured: false,
      })
      .select()
      .single();

    if (jobError) {
      console.error('Job creation error:', jobError);
      // Clean up location and company if job fails
      await supabase.from('locations').delete().eq('id', location.id);
      await supabase.from('companies').delete().eq('id', company.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create job record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store contact email in job_sources as a reference (lowercase for consistent matching)
    await supabase
      .from('job_sources')
      .insert({
        job_id: job.id,
        source_type: 'employer_direct',
        source_url: `mailto:${contactEmail.trim().toLowerCase()}`,
      });

    console.log('Job posted successfully:', job.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId: job.id,
        message: 'Job posted successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
