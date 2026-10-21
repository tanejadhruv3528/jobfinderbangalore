# JobPins — Project Context

## Vision

JobPins aims to become a trusted, location-first job discovery platform that makes local hiring faster and more intuitive. The long-term vision is to help job seekers discover nearby opportunities visually while enabling employers to hire locally with minimal friction. The product starts with Bangalore and is designed to expand to other cities once demand is validated.

---

## Problem Statement

Traditional job portals are list-heavy, noisy, and location-agnostic, making it difficult for job seekers to identify nearby opportunities and for employers to reach relevant local candidates. Small businesses and startups especially struggle to get visibility without paying large upfront fees.

JobPins solves this by:

- Focusing on **proximity-first job discovery**
- Using an **interactive map** instead of endless lists
- Reducing complexity for both job seekers and employers

---

## Target Users

### Primary

- **Job seekers in Bangalore** looking for nearby opportunities
- **Local employers, startups, and small businesses** hiring in Bangalore

### Secondary (future)

- Recruiters and HR teams
- Employers in other Indian cities

---

## Core Principles

1. **Location First**
    
    Jobs are discovered visually based on proximity, not just keywords.
    
2. **Simplicity Over Features**
    
    V1 prioritizes clarity, stability, and usability over feature depth.
    
3. **Low Friction**
    - Job seekers do not need accounts.
    - Employers can post jobs with minimal steps.
4. **Stability Before Scale**
    
    Logic is frozen once stable; changes are incremental and intentional.
    
5. **Lean Operations**
    
    Infrastructure and tooling are kept minimal and cost-efficient until validation.
    

---

## Core Features (V1 – Locked Scope)

### Job Seeker

- View jobs on a map and in a list
- Discover jobs based on location
- Click “Apply Now” to external application links
- No login required

### Employer

- Email/password signup and login
- Post a job
- Provide job location via Google Maps link (lat/lng extracted)
- View posted jobs in “My Jobs”
- Delete posted jobs

### Explicitly Excluded from V1

- Payments or subscriptions
- Job editing
- Analytics or insights
- Notifications
- Saved jobs
- Advanced filters
- AI features
- Multi-city support

---

## Technical Architecture

- **Frontend:** React + Vite + Tailwind + shadcn/ui, in this repo. Originally built with Lovable.
- **Data and auth:** Supabase project "Job Pins V2". Employers sign in with Supabase Auth; row-level security lets anyone read jobs and lets employers post and delete only their own.
- **No separate backend.** The Express API on Render was retired in October 2026 (see decisions).
- **Map:** Mapbox GL.
- **Hosting:** Vercel, deploying `main` to https://www.jobpins.in.
- **Database changes:** versioned SQL in `supabase/migrations/`.

---

## Current State

- End-to-end product is fully functional
- Authentication, job posting, listing, and deletion are stable
- Frontend foundation fixes completed (auth hydration, loaders, route stability)
- Backend logic is frozen
- Only UI/UX polish remains before soft launch
- Frontend is considered safe to export

---

## Monetization Strategy (Not Implemented)

- No payments in V1
- Monetization will be introduced only after validation
- Likely future models:
    - Pay-per-job posting
    - Featured job listings
- Early monetization expected to be manual before automation

---

## Assumptions

- Local hiring demand exists in Bangalore
- Employers are willing to pay for visibility once value is proven
- Visual, map-based discovery provides higher relevance than traditional lists
- A lean MVP can validate demand without heavy features
- Lovable is best used as a builder, not long-term hosting

---

## TODO

- Final UI/UX polish pass
- Export frontend code from Lovable
- Deploy frontend on Vercel
- Connect custom domain to Vercel
- Soft launch to initial audience
- Define success metrics for validation (e.g., active employers, repeat postings)
- Plan V1.5 / V2 feature roadmap based on real usage
