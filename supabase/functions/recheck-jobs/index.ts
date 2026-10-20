// 12-hourly re-check agent: opens the apply link of each crawled job that hasn't
// been checked in the last 12 hours and expires the ones that are gone.
// Uses no jobs-API calls. Expired jobs drop off the public map (see the jobs RLS policy).

import { adminClient, envInt, finishRun, isAuthorised, json, mapLimit, startRun } from '../_shared/common.ts';

const CLOSED_PATTERNS = [
  /no longer accepting applications/i,
  /(job|position|posting|vacancy) (has )?(expired|closed|been filled|is no longer available)/i,
  /this job is no longer (available|active|open)/i,
  /job not found/i,
];

type Verdict = { expired: false } | { expired: true; reason: string };

const checkLink = async (url: string): Promise<Verdict> => {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobPinsBot/1.0; +https://www.jobpins.in)' },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404 || res.status === 410) return { expired: true, reason: `link returned ${res.status}` };
    // Boards often block bots (403, 429, LinkedIn's 999). That says nothing about the job.
    if (!res.ok) return { expired: false };
    const html = (await res.text()).slice(0, 300_000);
    const hit = CLOSED_PATTERNS.find((p) => p.test(html));
    return hit ? { expired: true, reason: 'page says the job is closed' } : { expired: false };
  } catch {
    // Timeouts and DNS errors are often temporary; the stale rule below catches dead jobs.
    return { expired: false };
  }
};

Deno.serve(async (req) => {
  if (!isAuthorised(req)) return json({ error: 'unauthorised' }, 401);

  const db = adminClient();
  const runId = await startRun(db, 'recheck');
  const stats = { checked: 0, still_active: 0, expired_dead_link: 0, expired_stale: 0 };

  try {
    const staleDays = envInt('STALE_AFTER_DAYS', 21);
    const checkedBefore = new Date(Date.now() - 12 * 3600_000).toISOString();
    const seenBefore = new Date(Date.now() - staleDays * 86400_000).toISOString();

    // Not seen on Google for staleDays: the listing has almost certainly been taken down.
    const { data: stale, error: staleError } = await db.from('jobs')
      .update({ status: 'expired', expired_reason: `not on Google for ${staleDays} days`, last_checked_at: new Date().toISOString() })
      .neq('source', 'employer').eq('status', 'active').lt('last_seen_at', seenBefore)
      .select('id');
    if (staleError) throw new Error(staleError.message);
    stats.expired_stale = stale?.length ?? 0;

    const { data: jobs, error } = await db.from('jobs')
      .select('id, apply_url')
      .neq('source', 'employer').eq('status', 'active')
      .or(`last_checked_at.is.null,last_checked_at.lt.${checkedBefore}`)
      .order('last_checked_at', { ascending: true, nullsFirst: true })
      .limit(envInt('RECHECK_PER_RUN', 150));
    if (error) throw new Error(error.message);

    const verdicts = await mapLimit(jobs ?? [], 10, async (job) => ({ id: job.id as string, ...(await checkLink(job.apply_url)) }));
    stats.checked = verdicts.length;
    const now = new Date().toISOString();

    const active = verdicts.filter((v) => !v.expired).map((v) => v.id);
    if (active.length > 0) {
      await db.from('jobs').update({ last_checked_at: now }).in('id', active);
      stats.still_active = active.length;
    }
    for (const v of verdicts) {
      if (!v.expired) continue;
      await db.from('jobs').update({ status: 'expired', expired_reason: v.reason, last_checked_at: now }).eq('id', v.id);
      stats.expired_dead_link++;
    }

    await finishRun(db, runId, stats);
    return json(stats);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await finishRun(db, runId, stats, message);
    return json({ error: message, ...stats }, 500);
  }
});
