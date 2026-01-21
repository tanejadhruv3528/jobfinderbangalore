import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { jobId, email } = body;

    // Validate inputs
    if (!jobId || !email) {
      return new Response(
        JSON.stringify({ error: 'Job ID and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the job belongs to this email
    const { data: jobSource, error: sourceError } = await supabase
      .from('job_sources')
      .select('job_id')
      .eq('job_id', jobId)
      .eq('source_type', 'employer_direct')
      .eq('source_url', `mailto:${email.trim().toLowerCase()}`)
      .single();

    if (sourceError || !jobSource) {
      return new Response(
        JSON.stringify({ error: 'Job not found or you do not have permission to delete it' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get job to find associated company and location
    const { data: job, error: jobFetchError } = await supabase
      .from('jobs')
      .select('company_id, location_id')
      .eq('id', jobId)
      .single();

    if (jobFetchError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete in order: job_sources -> job -> location -> company
    // Delete job_sources first (foreign key constraint)
    await supabase
      .from('job_sources')
      .delete()
      .eq('job_id', jobId);

    // Delete job
    const { error: deleteJobError } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId);

    if (deleteJobError) {
      console.error('Error deleting job:', deleteJobError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete location
    if (job.location_id) {
      await supabase
        .from('locations')
        .delete()
        .eq('id', job.location_id);
    }

    // Check if company has any other jobs before deleting
    const { data: otherJobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('company_id', job.company_id)
      .limit(1);

    if (!otherJobs || otherJobs.length === 0) {
      // No other jobs, safe to delete company
      await supabase
        .from('companies')
        .delete()
        .eq('id', job.company_id);
    }

    console.log('Job deleted successfully:', jobId);

    return new Response(
      JSON.stringify({ success: true, message: 'Job deleted successfully' }),
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
