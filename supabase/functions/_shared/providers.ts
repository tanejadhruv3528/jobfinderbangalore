// Google Jobs results through a SERP API. Set JOBS_PROVIDER to pick one;
// both return the same Google Jobs data, normalised to RawJob here.

export interface RawJob {
  title: string;
  company: string;
  location: string;
  via: string;
  description: string;
  applyUrl: string;
  scheduleType: string;
  salary: string;
  postedAt: string;
}

const LOCATION = 'Bengaluru, Karnataka, India';

interface ProviderJob {
  title?: string;
  company_name?: string;
  location?: string;
  via?: string;
  description?: string;
  share_link?: string;
  sharing_link?: string;
  apply_link?: string;
  apply_options?: { title?: string; link?: string }[];
  apply_links?: { source?: string; link?: string }[];
  detected_extensions?: { schedule_type?: string; salary?: string; posted_at?: string };
}

// Prefer the employer's own careers page, then any board, then Google's share link.
const pickApplyUrl = (job: ProviderJob): string => {
  const links = [
    job.apply_link,
    ...(job.apply_options ?? []).map((o) => o.link),
    ...(job.apply_links ?? []).map((o) => o.link),
  ].filter((l): l is string => !!l && /^https?:\/\//i.test(l));
  const boards = /linkedin|naukri|indeed|glassdoor|foundit|monster|shine|instahyre|apna|timesjobs|cutshort|wellfound/i;
  return links.find((l) => !boards.test(l)) ?? links[0] ?? job.share_link ?? job.sharing_link ?? '';
};

const normalise = (job: ProviderJob): RawJob => ({
  title: (job.title ?? '').trim(),
  company: (job.company_name ?? '').trim(),
  location: (job.location ?? '').trim(),
  via: (job.via ?? '').replace(/^via\s+/i, '').trim(),
  description: (job.description ?? '').trim(),
  applyUrl: pickApplyUrl(job),
  scheduleType: job.detected_extensions?.schedule_type ?? '',
  salary: job.detected_extensions?.salary ?? '',
  postedAt: job.detected_extensions?.posted_at ?? '',
});

const getJson = async (url: URL): Promise<Record<string, unknown>> => {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Jobs API ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
  return body as Record<string, unknown>;
};

const searchSerpApi = async (query: string, apiKey: string): Promise<RawJob[]> => {
  const url = new URL('https://serpapi.com/search.json');
  url.search = new URLSearchParams({
    engine: 'google_jobs', q: query, location: LOCATION, gl: 'in', hl: 'en', api_key: apiKey,
  }).toString();
  const body = await getJson(url);
  return ((body.jobs_results as ProviderJob[]) ?? []).map(normalise);
};

const searchSearchApi = async (query: string, apiKey: string): Promise<RawJob[]> => {
  const url = new URL('https://www.searchapi.io/api/v1/search');
  url.search = new URLSearchParams({
    engine: 'google_jobs', q: query, location: LOCATION, gl: 'in', hl: 'en', api_key: apiKey,
  }).toString();
  const body = await getJson(url);
  return ((body.jobs as ProviderJob[]) ?? []).map(normalise);
};

// One API call per query (the first page, about 10 jobs).
export const searchGoogleJobs = (query: string): Promise<RawJob[]> => {
  const provider = Deno.env.get('JOBS_PROVIDER') ?? 'serpapi';
  const apiKey = Deno.env.get('JOBS_API_KEY');
  if (!apiKey) throw new Error('JOBS_API_KEY is not set');
  if (provider === 'serpapi') return searchSerpApi(query, apiKey);
  if (provider === 'searchapi') return searchSearchApi(query, apiKey);
  throw new Error(`Unknown JOBS_PROVIDER "${provider}" (use serpapi or searchapi)`);
};
