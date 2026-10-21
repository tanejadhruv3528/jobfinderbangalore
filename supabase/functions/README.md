# Job crawler and re-check agent

Two Supabase Edge Functions keep JobPins stocked with jobs found on Google Jobs.
They write into `public.jobs` with `source = 'google_jobs'` and no `employer_id`.

| Function | Schedule (pg_cron) | What it does |
| --- | --- | --- |
| `crawl-jobs` | daily, 06:00 IST | Runs the least recently used rows of `crawl_queries` against Google Jobs (one API call each). New listings are analysed (Bangalore only, spam filter, job type, experience, salary, office area) and pinned on the map. Listings already stored only get `last_seen_at` updated. |
| `recheck-jobs` | every 12 hours, 07:00 and 19:00 IST | Opens the apply link of every crawled job not checked in 12 hours. A 404/410, or a page saying the job is closed, marks it `expired`. Jobs not seen on Google for 21 days also expire. Uses no API calls. |

Expired jobs stay in the table but are hidden from the public map by RLS.
Every run writes a row to `crawl_runs` with its counts and any error.

## Map pins

Google Jobs usually gives only "Bengaluru, Karnataka", so each job's pin comes from:
1. an area named in the listing (`_shared/areas.ts`), placed at that area's centre (`location_precision = 'area'`), or
2. the company's Bangalore office on Google Maps (`location_precision = 'company'`).

A job with neither is saved with `location_precision = 'city'` and stays hidden from the site. At the end of each crawl, up to `MAPS_LOOKUPS_PER_RUN` waiting companies are looked up on Google Maps (one search each). Results are cached in `company_locations`, so each company costs one lookup ever, and every waiting job of a found company gets pinned.

## Setup

Apply the migrations in `supabase/migrations` after the Supabase-only migrations, then:

1. **Jobs API key.** Sign up for a free plan at [SerpApi](https://serpapi.com) (or [SearchApi](https://www.searchapi.io)).
2. **Edge Function secrets** (Dashboard, Edge Functions, Secrets, or `supabase secrets set`):
   - `JOBS_API_KEY`: the key from step 1
   - `JOBS_PROVIDER`: `serpapi` (default) or `searchapi`
   - `ANTHROPIC_API_KEY` (optional): turns on Claude analysis. Without it, simple keyword rules are used and fewer jobs get an area pin.
3. **Deploy:** `supabase functions deploy crawl-jobs` and `supabase functions deploy recheck-jobs`.
4. **Vault secrets** for pg_cron (SQL editor). The functions check the `x-cron-secret` header against the same Vault entry:
   ```sql
   SELECT vault.create_secret('https://jaovcgfdgksjjvbjjsne.supabase.co', 'project_url');
   SELECT vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'crawler_cron_secret');
   ```
5. **Try it once** (SQL editor), then look at `crawl_runs`:
   ```sql
   SELECT private.invoke_crawler_function('crawl-jobs');
   ```

## Tuning

| Secret | Default | Meaning |
| --- | --- | --- |
| `CRAWL_QUERIES_PER_RUN` | 3 | Job searches per daily run. |
| `MAPS_LOOKUPS_PER_RUN` | 5 | Google Maps office lookups per daily run. 3 + 5 = 8 a day fits a 250 searches/month free plan; raise both on a paid plan. |
| `RECHECK_PER_RUN` | 150 | Apply links checked per re-check run. |
| `STALE_AFTER_DAYS` | 21 | Expire a job not seen on Google for this many days. |
| `ANALYSIS_MODEL` | `claude-haiku-5-5` | Claude model used for analysis. |

To change what gets searched, add, edit or disable rows in `crawl_queries` (each query runs with "Bangalore" appended).
