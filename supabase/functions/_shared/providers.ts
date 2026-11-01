// LinkedIn job listings through Bright Data's LinkedIn Jobs API (dataset
// gd_lpfll7v5hcqtkxl6l). Bright Data collects public LinkedIn job pages and
// sells them as data; JobPins never contacts LinkedIn itself.
// Discovery runs asynchronously: startDiscovery() returns a snapshot id, and
// getSnapshot() returns the jobs once Bright Data has finished collecting them.

export interface RawJob {
  externalId: string;
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

const API = 'https://api.brightdata.com/datasets/v3';
const DATASET_ID = 'gd_lpfll7v5hcqtkxl6l';
const LOCATION = 'Bengaluru, Karnataka, India';

interface BrightDataJob {
  job_posting_id?: string | number;
  url?: string;
  job_title?: string;
  company_name?: string;
  job_location?: string;
  job_summary?: string;
  job_employment_type?: string;
  job_base_pay_range?: string;
  base_salary?: { currency?: string; min_amount?: number; max_amount?: number; payment_period?: string } | null;
  job_posted_date?: string;
  error?: string;
}

const apiKey = (): string => {
  const key = Deno.env.get('BRIGHTDATA_API_KEY');
  if (!key) throw new Error('BRIGHTDATA_API_KEY is not set');
  return key;
};

const call = async (path: string, init: RequestInit = {}): Promise<unknown> => {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json', ...init.headers },
    signal: AbortSignal.timeout(60_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Bright Data ${res.status}: ${text.slice(0, 200)}`);
  try {
    return JSON.parse(text);
  } catch {
    // NDJSON fallback
    return text.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  }
};

const salaryOf = (job: BrightDataJob): string => {
  const s = job.base_salary;
  if (s && (s.min_amount || s.max_amount)) {
    const range = [s.min_amount, s.max_amount].filter((n) => n).join('-');
    return `${s.currency ?? ''} ${range}${s.payment_period ? ` per ${s.payment_period.toLowerCase()}` : ''}`.trim();
  }
  return job.job_base_pay_range ?? '';
};

const normalise = (job: BrightDataJob): RawJob => ({
  externalId: String(job.job_posting_id ?? ''),
  title: (job.job_title ?? '').trim(),
  company: (job.company_name ?? '').trim(),
  location: (job.job_location ?? '').trim(),
  via: 'LinkedIn',
  description: (job.job_summary ?? '').trim(),
  // People apply on LinkedIn itself
  applyUrl: (job.url ?? '').split('?')[0],
  scheduleType: job.job_employment_type ?? '',
  salary: salaryOf(job),
  postedAt: job.job_posted_date ?? '',
});

// Starts one discovery request covering every query. Returns the snapshot id.
export const startDiscovery = async (queries: string[], perQuery: number): Promise<string> => {
  const params = new URLSearchParams({
    dataset_id: DATASET_ID,
    type: 'discover_new',
    discover_by: 'keyword',
    include_errors: 'true',
    notify: 'false',
  });
  const timeRange = Deno.env.get('LINKEDIN_TIME_RANGE') ?? 'Past week';
  const body = {
    input: queries.map((keyword) => ({
      keyword,
      location: LOCATION,
      country: 'IN',
      time_range: timeRange,
      job_type: '',
      experience_level: '',
      remote: '',
      company: '',
    })),
    limit_per_input: perQuery,
  };
  const res = (await call(`/trigger?${params}`, { method: 'POST', body: JSON.stringify(body) })) as { snapshot_id?: string };
  if (!res.snapshot_id) throw new Error(`Bright Data returned no snapshot id: ${JSON.stringify(res).slice(0, 200)}`);
  return res.snapshot_id;
};

export type Snapshot =
  | { status: 'pending' }
  | { status: 'failed'; error: string }
  | { status: 'ready'; jobs: RawJob[]; records: number };

export const getSnapshot = async (snapshotId: string): Promise<Snapshot> => {
  const id = encodeURIComponent(snapshotId);
  const progress = (await call(`/progress/${id}`)) as { status?: string; error_message?: string };
  if (progress.status === 'failed' || progress.status === 'canceled') {
    return { status: 'failed', error: progress.error_message ?? progress.status };
  }
  if (progress.status !== 'ready') return { status: 'pending' };

  const data = await call(`/snapshot/${id}?format=json`);
  const records = Array.isArray(data) ? (data as BrightDataJob[]) : [];
  const jobs = records
    .filter((r) => !r.error && r.job_posting_id && r.url)
    .map(normalise)
    .filter((j) => j.externalId && /^https?:\/\//i.test(j.applyUrl));
  return { status: 'ready', jobs, records: records.length };
};
