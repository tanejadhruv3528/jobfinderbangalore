// Crawler: gets Bangalore jobs from LinkedIn through Bright Data's LinkedIn Jobs API
// and writes them to public.jobs (source = 'linkedin').
// Bright Data discovery is asynchronous, so each run:
//   1. downloads any snapshot started earlier that is now ready, analyses the new
//      listings and stores them (jobs already stored only get last_seen_at bumped),
//   2. starts a new snapshot for the least recently used search terms, at most once a day,
//   3. looks up a few company offices on Google Maps for jobs still waiting for a pin.
// pg_cron calls it at 06:00 IST (starts the snapshot) and 06:30-08:30 IST (collects it).

import { analyseJobs } from '../_shared/analyse.ts';
import { findArea } from '../_shared/areas.ts';
import { adminClient, envInt, finishRun, isAuthorised, json, mapLimit, startRun } from '../_shared/common.ts';
import { companyKey, findOfficeOnMaps } from '../_shared/geocode.ts';
import { getSnapshot, type RawJob, startDiscovery } from '../_shared/providers.ts';

const SOURCE = 'linkedin';
const BANGALORE_CENTER = { latitude: 12.9716, longitude: 77.5946 };
const ANALYSIS_BATCH = 20;

const sameJobKey = (company: string, title: string) => `${company}|${title}`.toLowerCase().replace(/\s+/g, ' ').trim();

// Short excerpt only: the full listing stays on LinkedIn, where people apply.
const excerpt = (text: string, max = 600): string => {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 40))}…`;
};

Deno.serve(async (req) => {
  const db = adminClient();
  if (!(await isAuthorised(req, db))) return json({ error: 'unauthorised' }, 401);
  const runId = await startRun(db, 'crawl');
  const stats = {
    snapshots_started: 0, snapshots_collected: 0, snapshots_failed: 0, snapshots_waiting: 0,
    records: 0, found: 0, seen_again: 0, inserted: 0, rejected: 0, already_from_google: 0,
    awaiting_pin: 0, maps_lookups: 0, pinned_from_maps: 0, used_claude: false,
  };

  try {
    const now = new Date().toISOString();

    // Offices already looked up on Maps (found or not)
    const { data: cached, error: cacheError } = await db.from('company_locations').select('company_key, found, latitude, longitude');
    if (cacheError) throw new Error(cacheError.message);
    const offices = new Map((cached ?? []).map((c) => [c.company_key as string, c]));

    const storeJobs = async (found: RawJob[]) => {
      const byId = new Map<string, RawJob>();
      for (const job of found) byId.set(job.externalId, job);
      const ids = [...byId.keys()];
      if (ids.length === 0) return;

      const known = new Set<string>();
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await db.from('jobs').select('external_id').eq('source', SOURCE).in('external_id', ids.slice(i, i + 200));
        if (error) throw new Error(error.message);
        for (const r of data ?? []) known.add(r.external_id as string);
      }
      if (known.size > 0) {
        stats.seen_again += known.size;
        const list = [...known];
        for (let i = 0; i < list.length; i += 200) {
          await db.from('jobs').update({ last_seen_at: now, status: 'active', expired_reason: null })
            .eq('source', SOURCE).in('external_id', list.slice(i, i + 200));
        }
      }

      // Skip jobs still live from the old Google Jobs crawl, so the map doesn't show them twice
      const { data: google } = await db.from('jobs').select('company_name, title').eq('source', 'google_jobs').eq('status', 'active');
      const fromGoogle = new Set((google ?? []).map((g) => sameJobKey(g.company_name as string, g.title as string)));
      const fresh = ids.filter((id) => !known.has(id)).map((id) => byId.get(id)!).filter((job) => {
        if (!fromGoogle.has(sameJobKey(job.company, job.title))) return true;
        stats.already_from_google++;
        return false;
      });

      const batches: RawJob[][] = [];
      for (let i = 0; i < fresh.length; i += ANALYSIS_BATCH) batches.push(fresh.slice(i, i + ANALYSIS_BATCH));
      const analysed = await mapLimit(batches, 3, (batch) => analyseJobs(batch));
      const results = analysed.flatMap((a) => a.results);
      stats.used_claude ||= analysed.some((a) => a.usedClaude);

      const rows = [];
      for (const [i, job] of fresh.entries()) {
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
          // Hidden until a Maps lookup pins it (or stays hidden if Maps has no office)
          stats.awaiting_pin++;
        }

        rows.push({
          source: SOURCE,
          external_id: job.externalId.slice(0, 128),
          source_via: job.via,
          company_name: job.company.slice(0, 120),
          title: job.title.slice(0, 100),
          description: excerpt(job.description) || job.title.slice(0, 100),
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

      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await db.from('jobs')
          .upsert(rows.slice(i, i + 200), { onConflict: 'source,external_id', ignoreDuplicates: true });
        if (error) throw new Error(error.message);
      }
      stats.inserted += rows.length;
    };

    // 1. Collect snapshots started earlier
    const { data: pending, error: pendingError } = await db.from('linkedin_snapshots')
      .select('snapshot_id, created_at').eq('status', 'pending').order('created_at', { ascending: true });
    if (pendingError) throw new Error(pendingError.message);

    for (const s of pending ?? []) {
      const snap = await getSnapshot(s.snapshot_id);
      if (snap.status === 'pending') {
        if (Date.now() - new Date(s.created_at).getTime() > 24 * 3600_000) {
          await db.from('linkedin_snapshots').update({ status: 'failed', finished_at: now, error: 'not ready after 24 hours' })
            .eq('snapshot_id', s.snapshot_id);
          stats.snapshots_failed++;
        } else {
          stats.snapshots_waiting++;
        }
        continue;
      }
      if (snap.status === 'failed') {
        await db.from('linkedin_snapshots').update({ status: 'failed', finished_at: now, error: snap.error.slice(0, 500) })
          .eq('snapshot_id', s.snapshot_id);
        stats.snapshots_failed++;
        continue;
      }
      stats.records += snap.records;
      stats.found += snap.jobs.length;
      await storeJobs(snap.jobs);
      await db.from('linkedin_snapshots').update({ status: 'processed', finished_at: now, records: snap.records })
        .eq('snapshot_id', s.snapshot_id);
      stats.snapshots_collected++;
    }

    // 2. Start today's snapshot (once a day). Bright Data bills per job returned,
    // so queries x jobs per query is the daily cap: 8 x 40 = 320 jobs, about $7 a month.
    const since = new Date(Date.now() - 20 * 3600_000).toISOString();
    const { count: startedToday, error: countError } = await db.from('linkedin_snapshots')
      .select('snapshot_id', { count: 'exact', head: true }).gte('created_at', since);
    if (countError) throw new Error(countError.message);

    if (!startedToday) {
      const { data: queries, error } = await db
        .from('crawl_queries')
        .select('id, query')
        .eq('enabled', true)
        .order('last_run_at', { ascending: true, nullsFirst: true })
        .limit(envInt('CRAWL_QUERIES_PER_RUN', 8));
      if (error) throw new Error(error.message);
      if (queries && queries.length > 0) {
        const terms = queries.map((q) => q.query as string);
        const snapshotId = await startDiscovery(terms, envInt('LINKEDIN_JOBS_PER_QUERY', 40));
        const { error: insertError } = await db.from('linkedin_snapshots').insert({ snapshot_id: snapshotId, queries: terms });
        if (insertError) throw new Error(insertError.message);
        await db.from('crawl_queries').update({ last_run_at: now }).in('id', queries.map((q) => q.id));
        stats.snapshots_started++;
      }
    }

    // 3. Look up the offices of companies whose jobs are waiting for a pin
    const { data: waiting, error: waitingError } = await db.from('jobs')
      .select('company_name')
      .eq('source', SOURCE).eq('status', 'active').eq('location_precision', 'city')
      .order('created_at', { ascending: true })
      .limit(500);
    if (waitingError) throw new Error(waitingError.message);
    const toLookUp = [...new Set((waiting ?? []).map((j) => j.company_name as string))]
      .filter((c) => !offices.has(companyKey(c)))
      .slice(0, envInt('MAPS_LOOKUPS_PER_RUN', 2));

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
