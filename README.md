# JobPins

Map-first job discovery for Bangalore. Job seekers browse jobs on a map and apply on the employer's own site; employers sign in to post and remove jobs.

Live at https://www.jobpins.in.

## How it fits together

- **This repo** is the whole app: a React + Vite frontend (Tailwind, shadcn/ui, Mapbox GL).
- **Supabase project "Job Pins V2"** holds the data and handles employer sign-in. Row-level security lets anyone read jobs and lets employers create and delete only their own.
- **Vercel** builds `main` and serves it at www.jobpins.in. Pull requests get preview deployments.

Product context, decisions and roadmap are in [`docs/`](docs/).

## Run locally

```sh
npm ci
cp .env.example .env   # fill in the publishable key from Supabase -> Settings -> API
npm run dev
```

## Database changes

Schema lives in `supabase/migrations/`. Add a new timestamped SQL file for each change and apply it to Job Pins V2 (Supabase SQL editor or `supabase db push`) before merging code that depends on it.

## Checks

```sh
npm run lint
npm run build
```
