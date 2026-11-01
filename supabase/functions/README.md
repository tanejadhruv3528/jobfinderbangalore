# Job crawler and re-check agent

Two Supabase Edge Functions keep JobPins stocked with Bangalore jobs from LinkedIn.
They write into `public.jobs` with `source = 'linkedin'` and no `employer_id`.

LinkedIn has no public API for reading jobs, and scraping it directly breaks its
terms. So the listings come from [Bright Data's LinkedIn Jobs API](https://brightdata.com/products/web-scraper/linkedin/jobs),
which collects public LinkedIn job pages and sells them as data. JobPins never
contacts LinkedIn itself: not to crawl, and not to re-check links. Each job shows
a short excerpt and sends people to LinkedIn to read the full listing and apply.

| Function | Schedule (pg_cron) | What it does |
| --- | --- | --- |
| `crawl-jobs` | 06:00 IST, then 06:30, 07:30 and 08:30 IST | Bright Data discovery is asynchronous. The 06:00 run starts one snapshot for the least recently used rows of `crawl_queries` (recorded in `linkedin_snapshots`). The later runs download it once it is ready, analyse the new listings (Bangalore only, spam filter, job type, experience, salary, office area) and pin them on the map. Listings already stored only get `last_seen_at` updated. Every run also does a few Google Maps office lookups. |
| `recheck-jobs` | every 12 hours, 07:00 and 19:00 IST | Expires crawled jobs the crawler hasn't found for `STALE_AFTER_DAYS`. For the old Google Jobs rows it also opens the apply link and expires 404/410 or "job closed" pages. LinkedIn links are never opened. |

Expired jobs stay in the table but are hidden from the public map by RLS.
Every run writes a row to `crawl_runs` with its counts and any error.

Jobs from the earlier Google Jobs crawl (`source = 'google_jobs'`) stay until they expire. While they are live, the same company and title from LinkedIn is skipped so nothing shows twice.

## Cost

Bright Data bills per job record returned (about $0.75 per 1,000 on pay as you go).
The daily cap is `CRAWL_QUERIES_PER_RUN` x `LINKEDIN_JOBS_PER_QUERY` = 8 x 40 = 320 records, about $7 a month.
Google Maps lookups still go through SerpApi (`JOBS_API_KEY`): 4 runs x `MAPS_LOOKUPS_PER_RUN` 2 = 8 a day, inside the 250 searches a month free plan.

## Map pins

LinkedIn often gives only "Bengaluru, Karnataka", so each job's pin comes from:
1. an area named in the listing (`_shared/areas.ts`), placed at that area's centre (`location_precision = 'area'`), or
2. the company's Bangalore office on Google Maps (`location_precision = 'company'`).

A job with neither is saved with `location_precision = 'city'` and stays hidden from the site. At the end of each crawl, up to `MAPS_LOOKUPS_PER_RUN` waiting companies are looked up on Google Maps (one search each). Results are cached in `company_locations`, so each company costs one lookup ever, and every waiting job of a found company gets pinned.

## Setup

Apply the migrations in `supabase/migrations` after the Supabase-only migrations, then:

1. **API keys.** A [Bright Data](https://brightdata.com) account with an API key (Account settings, API keys), and a free [SerpApi](https://serpapi.com) key (or [SearchApi](https://www.searchapi.io)) for the Google Maps office lookups.
2. **Edge Function secrets** (Dashboard, Edge Functions, Secrets, or `supabase secrets set`):
   - `BRIGHTDATA_API_KEY`: the Bright Data key
   - `JOBS_API_KEY`: the SerpApi key, used only for Maps lookups
   - `JOBS_PROVIDER`: `serpapi` (default) or `searchapi`
   - `ANTHROPIC_API_KEY` (optional): turns on Claude analysis. Without it, simple keyword rules are used and fewer jobs get an area pin.
3. **Deploy:** `supabase functions deploy crawl-jobs` and `supabase functions deploy recheck-jobs`.
4. **Vault secrets** for pg_cron (SQL editor). The functions check the `x-cron-secret` header against the same Vault entry:
   ```sql
   SELECT vault.create_secret('https://jaovcgfdgksjjvbjjsne.supabase.co', 'project_url');
   SELECT vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'crawler_cron_secret');
   ```
5. **Try it once** (SQL editor). The first call starts a snapshot; call it again a few minutes later to collect it, then look at `crawl_runs` and `linkedin_snapshots`:
   ```sql
   SELECT private.invoke_crawler_function('crawl-jobs');
   ```

## Tuning

| Secret | Default | Meaning |
| --- | --- | --- |
| `CRAWL_QUERIES_PER_RUN` | 8 | Search terms in each daily LinkedIn snapshot. |
| `LINKEDIN_JOBS_PER_QUERY` | 40 | Most jobs Bright Data returns per search term (each one is billed). |
| `LINKEDIN_TIME_RANGE` | `Past week` | LinkedIn's "date posted" filter: `Past 24 hours`, `Past week`, `Past month` or `Any time`. |
| `MAPS_LOOKUPS_PER_RUN` | 2 | Google Maps office lookups per run (4 runs a day). |
| `RECHECK_PER_RUN` | 150 | Apply links checked per re-check run. |
| `STALE_AFTER_DAYS` | 21 | Expire a job the crawler hasn't found for this many days. |
| `ANALYSIS_MODEL` | `claude-haiku-5-5` | Claude model used for analysis. |

To change what gets searched, add, edit or disable rows in `crawl_queries` (each query runs with "Bangalore" appended).
