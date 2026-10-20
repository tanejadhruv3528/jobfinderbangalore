import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

// The functions are called by pg_cron with a shared secret, not by the site,
// so a leaked public key can't burn the jobs API quota.
export const isAuthorised = (req: Request): boolean => {
  const secret = Deno.env.get('CRON_SECRET');
  return !!secret && req.headers.get('x-cron-secret') === secret;
};

// Service-role client: bypasses RLS, server side only.
export const adminClient = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const envInt = (name: string, fallback: number): number => {
  const n = Number.parseInt(Deno.env.get(name) ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Runs fn over items with at most `limit` in flight.
export const mapLimit = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};

export const startRun = async (db: SupabaseClient, kind: 'crawl' | 'recheck'): Promise<string> => {
  const { data, error } = await db.from('crawl_runs').insert({ kind }).select('id').single();
  if (error) throw new Error(error.message);
  return data.id;
};

export const finishRun = async (db: SupabaseClient, id: string, stats: Record<string, unknown>, err?: string) => {
  await db.from('crawl_runs').update({ finished_at: new Date().toISOString(), stats, error: err ?? null }).eq('id', id);
};
