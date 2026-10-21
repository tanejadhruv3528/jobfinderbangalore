# JobPins — Finalized Decisions

This document captures **only confirmed, reinforced decisions** made throughout the JobPins discussion. Speculative ideas, experiments, and abandoned paths are excluded.

---

## Product Decisions

### Decision: Build a location-first job discovery platform

**Reason:**

Traditional job portals are noisy and list-heavy. A proximity-first, map-based approach provides clearer local relevance for both job seekers and employers.

---

### Decision: Start with a single city (Bangalore)

**Reason:**

Focusing on Bangalore allows faster validation, simpler operations, and clearer feedback before expanding to other cities.

---

### Decision: Keep V1 intentionally minimal

**Reason:**

Stability, clarity, and usability were prioritized over feature breadth to ensure a reliable MVP and avoid overengineering.

---

### Decision: Do not require job seekers to create accounts

**Reason:**

Removing signup friction improves discovery and adoption for job seekers, aligning with the platform’s low-friction principle.

---

### Decision: Employers must authenticate to post jobs

**Reason:**

Authentication is required to maintain ownership, allow job management (“My Jobs”), and prevent misuse.

---

### Decision: Exclude monetization from V1

**Reason:**

Payments and pricing add complexity and risk. Monetization will only be introduced after validating real usage and employer demand.

---

### Decision: Use external “Apply Now” links

**Reason:**

Avoids handling candidate data, simplifies compliance, and keeps the platform focused on discovery rather than applications.

---

## UX Decisions

### Decision: Treat slow, blank, or stuck UI as bugs

**Reason:**

Poor perceived performance undermines trust. Any delayed or blocked UI was considered a critical UX failure and fixed.

---

### Decision: Freeze frontend logic after foundation fixes

**Reason:**

Once auth, routing, and data flows were stable, further logic changes were frozen to prevent regressions before launch.

---

### Decision: Limit Lovable usage to a small number of high-impact prompts

**Reason:**

Lovable credits are limited and expensive. A “foundation” prompt for stability and a possible UI-only polish prompt were deemed sufficient.

---

### Decision: Restrict further frontend changes to UI/UX polish only

**Reason:**

Visual consistency and clarity improve trust without risking functional stability.

---

### Decision: Remove Lovable branding before launch

**Reason:**

Third-party branding reduces credibility with employers; a professional, own-brand appearance is required for launch.

---

## Technical Decisions

### Decision: Use Lovable as a frontend builder, not long-term host

**Reason:**

Lovable is effective for rapid UI creation but not cost-efficient or flexible for long-term hosting.

---

### Decision: Export frontend code and host it independently

**Reason:**

Exporting provides full code ownership, lower ongoing costs, and freedom from Lovable credit limits.

---

### Decision: Deploy frontend on Vercel

**Reason:**

Vercel offers free or low-cost hosting, excellent React/Next.js support, custom domains, and easy CI/CD.

---

### Decision: Use Supabase for data and auth; no separate backend (October 2026)

**Reason:**

The Express API on Render was a second service to host, slept on the free plan, and its endpoints had drifted from the frontend. Supabase Auth plus row-level security covers employer sign-in and job ownership with one service. Supersedes the earlier decisions to use Node.js + Express, Render, and custom JWT auth.

---

### Decision: Use Google Maps links to derive job location (lat/lng)

**Reason:**

This ensures accurate, real-world locations without building a custom location picker.

---

## Open Decisions (TODO)

### Decision: Final UI/UX polish scope

**Status:** Not finalized

**Notes:**

Only UI-only changes are allowed, but the exact polish level before export is still to be confirmed.

---

### Decision: Exact timing of frontend export and Lovable cancellation

**Status:** Not finalized

**Notes:**

Export will occur after UI is deemed “good enough,” but the precise cutoff point remains open.

---

### Decision: Monetization model and pricing

**Status:** Not finalized

**Notes:**

Pay-per-job and featured listings are likely, but pricing and implementation will be decided post-validation.
