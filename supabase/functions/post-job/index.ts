import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Parse coordinates from Google Maps URL
function parseGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  try {
    // Pattern 1: @lat,lng format (most common)
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) {
      return {
        lat: parseFloat(atMatch[1]),
        lng: parseFloat(atMatch[2]),
      };
    }

    // Pattern 2: !3d lat !4d lng format
    const dMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (dMatch) {
      return {
        lat: parseFloat(dMatch[1]),
        lng: parseFloat(dMatch[2]),
      };
    }

    // Pattern 3: q=lat,lng format
    const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) {
      return {
        lat: parseFloat(qMatch[1]),
        lng: parseFloat(qMatch[2]),
      };
    }

    // Pattern 4: place/name/@lat,lng
    const placeMatch = url.match(/place\/([^/@]+)\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (placeMatch) {
      return {
        lat: parseFloat(placeMatch[2]),
        lng: parseFloat(placeMatch[3]),
      };
    }

    return null;
  } catch (error) {
    console.error('Error parsing Google Maps URL:', error);
    return null;
  }
}

// Extract place name from Google Maps URL for geocoding fallback
function extractPlaceName(url: string): string | null {
  try {
    // Pattern: /place/Place+Name/
    const placeMatch = url.match(/\/place\/([^/@?]+)/);
    if (placeMatch) {
      return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    }
    return null;
  } catch {
    return null;
  }
}

// Geocode address using Nominatim
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = `${address}, Bangalore, Karnataka, India`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'JobPins/1.0' }
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
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
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
    const { companyName, jobTitle, jobDescription, maps_url, applyUrl, contactEmail } = body;

    console.log('Received data:', { companyName, jobTitle, jobDescription, maps_url, applyUrl, contactEmail });

    // Validate required fields
    if (!companyName || !jobTitle || !jobDescription || !maps_url || !applyUrl || !contactEmail) {
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

    // Validate and parse Google Maps URL
    try {
      new URL(maps_url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid Google Maps URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to parse coordinates from URL, fallback to geocoding place name
    let coords = parseGoogleMapsUrl(maps_url);
    let locationAddress = 'Bangalore';
    
    if (!coords) {
      // Try to extract place name and geocode it
      const placeName = extractPlaceName(maps_url);
      if (placeName) {
        console.log('Geocoding place name:', placeName);
        coords = await geocodeAddress(placeName);
        locationAddress = placeName;
      }
    }
    
    if (!coords) {
      return new Response(
        JSON.stringify({ error: 'Could not extract location from Google Maps URL. Please use a link that shows coordinates (e.g., right-click on the map and select the location).' }),
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
        address: locationAddress,
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
