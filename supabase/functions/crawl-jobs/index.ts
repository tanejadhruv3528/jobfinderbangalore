// Daily crawler: runs the least recently used search terms against Google Jobs,
// analyses the new listings and writes them to public.jobs (source = 'google_jobs').
// Jobs already in the table only get last_seen_at bumped, so they cost no analysis.

import { analyseJobs } from '../_shared/analyse.ts';
import { findArea } from '../_shared/areas.ts';
import { adminClient, envInt, finishRun, isAuthorised, json, startRun } from '../_shared/common.ts';
import { geocodeCompany } from '../_shared/geocode.ts';
import { type RawJob, searchGoogleJobs } from '../_shared/providers.ts';

const SOURCE = 'google_jobs';

const fingerprint = async (job: RawJob): Promise<string> => {
  const key = `${job.company}|${job.title}`.toLowerCase().replace(/\s+/g, ' ').trim();
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
};

Deno.serve(async (req) => {
  const db = adminClient();
  if (!(await isAuthorised(req, db))) return json({ error: 'unauthorised' }, 401);
  const runId = await startRun(db, 'crawl');
  const stats = { queries: 0, api_calls: 0, found: 0, seen_again: 0, inserted: 0, rejected: 0, unlocated: 0, used_claude: false };

  try {
    // ~7 a day stays inside a 250-searches-a-month free plan. Raise on a paid plan.
    const perRun = envInt('CRAWL_QUERIES_PER_RUN', 7);
    const { data: queries, error } = await db
      .from('crawl_queries')
      .select('id, query')
      .eq('enabled', true)
      .order('last_run_at', { ascending: true, nullsFirst: true })
      .limit(perRun);
    if (error) throw new Error(error.message);

    const now = new Date().toISOString();
    const geocodeBudget = { left: envInt('GEOCODE_PER_RUN', 10) };

    for (const q of queries ?? []) {
      stats.queries++;
      stats.api_calls++;
      const found = await searchGoogleJobs(`${q.query} Bangalore`);
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

        let pin: { latitude: number; longitude: number } | null = null;
        let precision: 'area' | 'company' = 'area';
        const area = findArea(a.area);
        if (area) {
          pin = { latitude: area.latitude, longitude: area.longitude };
        } else if (geocodeBudget.left > 0) {
          geocodeBudget.left--;
          pin = await geocodeCompany(job.company);
          precision = 'company';
        }
        // No usable pin: skip for now; the next crawl that sees it tries again.
        if (!pin) {
          stats.unlocated++;
          continue;
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

    await finishRun(db, runId, stats);
    return json(stats);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await finishRun(db, runId, stats, message);
    return json({ error: message, ...stats }, 500);
  }
});
