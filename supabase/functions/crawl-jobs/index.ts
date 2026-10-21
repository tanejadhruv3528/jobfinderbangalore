// Daily crawler: runs the least recently used search terms against Google Jobs,
// analyses the new listings and writes them to public.jobs (source = 'google_jobs').
// Jobs already in the table only get last_seen_at bumped, so they cost no analysis.
// Jobs whose listing names no area wait (hidden) until their company's office has
// been looked up on Google Maps, a few companies per run.

import { analyseJobs } from '../_shared/analyse.ts';
import { findArea } from '../_shared/areas.ts';
import { adminClient, envInt, finishRun, isAuthorised, json, startRun } from '../_shared/common.ts';
import { companyKey, findOfficeOnMaps } from '../_shared/geocode.ts';
import { type RawJob, searchGoogleJobs } from '../_shared/providers.ts';

const SOURCE = 'google_jobs';
const BANGALORE_CENTER = { latitude: 12.9716, longitude: 77.5946 };

const fingerprint = async (job: RawJob): Promise<string> => {
  const key = `${job.company}|${job.title}`.toLowerCase().replace(/\s+/g, ' ').trim();
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
};

Deno.serve(async (req) => {
  const db = adminClient();
  if (!(await isAuthorised(req, db))) return json({ error: 'unauthorised' }, 401);
  const runId = await startRun(db, 'crawl');
  const stats = {
    queries: 0, api_calls: 0, found: 0, seen_again: 0, inserted: 0, rejected: 0,
    awaiting_pin: 0, maps_lookups: 0, pinned_from_maps: 0, used_claude: false,
  };

  try {
    // 3 job searches + 5 Maps lookups a day stays inside a 250-searches-a-month
    // free plan. Raise both on a paid plan.
    const perRun = envInt('CRAWL_QUERIES_PER_RUN', 3);
    const { data: queries, error } = await db
      .from('crawl_queries')
      .select('id, query')
      .eq('enabled', true)
      .order('last_run_at', { ascending: true, nullsFirst: true })
      .limit(perRun);
    if (error) throw new Error(error.message);

    const now = new Date().toISOString();

    // Offices already looked up on Maps (found or not)
    const { data: cached, error: cacheError } = await db.from('company_locations').select('company_key, found, latitude, longitude');
    if (cacheError) throw new Error(cacheError.message);
    const offices = new Map((cached ?? []).map((c) => [c.company_key as string, c]));

    for (const q of queries ?? []) {
      stats.queries++;
      const found = await searchGoogleJobs(`${q.query} Bangalore`);
      stats.api_calls++;
      await db.from('crawl_queries').update({ last_run_at: now }).eq('id', q.id);
      stats.found += found.length;

      // Dedupe within the page and against what's already stored
      const byId = new Map<string, RawJob>();
      for (const job of found) byId.set(await fingerprint(job), job);
      const ids = [...byId.keys()];
      if (ids.length === 0) continue;

      const { data: existing } = await db.from('jobs').select('external_id').eq('source', SOURCE).in('external_id', ids);
      const known = new Set((existing ?? []).map((r) => r.external_id as string));
      if (known.size > 0) {
        stats.seen_again += known.size;
        await db.from('jobs').update({ last_seen_at: now, status: 'active', expired_reason: null })
          .eq('source', SOURCE).in('external_id', [...known]);
      }

      const fresh = ids.filter((id) => !known.has(id));
      const { results, usedClaude } = await analyseJobs(fresh.map((id) => byId.get(id)!));
      stats.used_claude ||= usedClaude;

      const rows = [];
      for (const [i, id] of fresh.entries()) {
        const job = byId.get(id)!;
        const a = results[i];
        if (!a.keep) {
          stats.rejected++;
          continue;
        }

        let pin = BANGALORE_CENTER;
        let precision: 'area' | 'company' | 'city' = 'city';
        const area = findArea(a.area);
        const office = offices.get(companyKey(job.company));
        if (area) {
          pin = { latitude: area.latitude, longitude: area.longitude };
          precision = 'area';
        } else if (office?.found) {
          pin = { latitude: office.latitude, longitude: office.longitude };
          precision = 'company';
        } else {
          // Hidden until the Maps lookup below pins it (or stays hidden if Maps has no office)
          stats.awaiting_pin++;
        }

        rows.push({
          source: SOURCE,
          external_id: id,
          source_via: job.via.slice(0, 120) || null,
          company_name: job.company.slice(0, 120),
          title: job.title.slice(0, 100),
          description: job.description.slice(0, 5000) || job.title.slice(0, 100),
          area: area?.name ?? null,
          latitude: pin.latitude,
          longitude: pin.longitude,
          location_precision: precision,
          apply_url: job.applyUrl,
          job_type: a.jobType,
          salary: a.salary || null,
          experience: a.experience || null,
          last_seen_at: now,
        });
      }

      if (rows.length > 0) {
        const { error: insertError } = await db.from('jobs')
          .upsert(rows, { onConflict: 'source,external_id', ignoreDuplicates: true });
        if (insertError) throw new Error(insertError.message);
        stats.inserted += rows.length;
      }
    }

    // Look up the offices of companies whose jobs are waiting for a pin
    const { data: waiting, error: waitingError } = await db.from('jobs')
      .select('company_name')
      .eq('source', SOURCE).eq('status', 'active').eq('location_precision', 'city')
      .order('created_at', { ascending: true })
      .limit(500);
    if (waitingError) throw new Error(waitingError.message);
    const toLookUp = [...new Set((waiting ?? []).map((j) => j.company_name as string))]
      .filter((c) => !offices.has(companyKey(c)))
      .slice(0, envInt('MAPS_LOOKUPS_PER_RUN', 5));

    for (const company of toLookUp) {
      const office = await findOfficeOnMaps(company);
      stats.maps_lookups++;
      await db.from('company_locations').upsert({
        company_key: companyKey(company),
        found: !!office,
        latitude: office?.latitude ?? null,
        longitude: office?.longitude ?? null,
      });
      if (!office) continue;
      const { data: pinned } = await db.from('jobs')
        .update({ latitude: office.latitude, longitude: office.longitude, location_precision: 'company' })
        .eq('source', SOURCE).eq('location_precision', 'city').eq('company_name', company)
        .select('id');
      stats.pinned_from_maps += pinned?.length ?? 0;
    }

    await finishRun(db, runId, stats);
    return json(stats);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await finishRun(db, runId, stats, message);
    return json({ error: message, ...stats }, 500);
  }
});
