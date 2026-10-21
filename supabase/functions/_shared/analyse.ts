// Turns raw Google Jobs listings into JobPins rows: drops spam and non-Bangalore
// jobs, tags job type, experience and salary, and finds the office area for the pin.
// Uses Claude when ANTHROPIC_API_KEY is set, and simple keyword rules otherwise.

import Anthropic from 'npm:@anthropic-ai/sdk@0.133.0';
import { AREAS, findArea, findAreaInText } from './areas.ts';
import type { RawJob } from './providers.ts';

export type JobType = 'full-time' | 'part-time' | 'contract' | 'internship';

export interface Analysis {
  keep: boolean;
  reason: string;
  area: string; // an AREAS name, or '' when the listing doesn't say
  jobType: JobType;
  experience: string;
  salary: string;
}

const JOB_TYPES: JobType[] = ['full-time', 'part-time', 'contract', 'internship'];

const guessJobType = (job: RawJob): JobType => {
  const s = `${job.scheduleType} ${job.title}`.toLowerCase();
  if (s.includes('intern')) return 'internship';
  if (s.includes('part')) return 'part-time';
  if (s.includes('contract') || s.includes('contractor')) return 'contract';
  return 'full-time';
};

const analyseWithRules = (job: RawJob): Analysis => {
  const inBangalore = /bengaluru|bangalore/i.test(`${job.location} ${job.description}`);
  return {
    keep: inBangalore && !!job.title && !!job.company && !!job.applyUrl,
    reason: inBangalore ? '' : 'not in Bangalore',
    area: findAreaInText(`${job.location} ${job.description}`)?.name ?? '',
    jobType: guessJobType(job),
    experience: '',
    salary: job.salary,
  };
};

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['jobs'],
  properties: {
    jobs: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['index', 'keep', 'reason', 'area', 'job_type', 'experience', 'salary'],
        properties: {
          index: { type: 'integer' },
          keep: { type: 'boolean' },
          reason: { type: 'string' },
          area: { type: 'string', enum: ['', ...AREAS.map((a) => a.name)] },
          job_type: { type: 'string', enum: JOB_TYPES },
          experience: { type: 'string' },
          salary: { type: 'string' },
        },
      },
    },
  },
};

const SYSTEM = `You review job listings found on Google Jobs for JobPins, a map of jobs in Bangalore.
For each listing return:
- keep: false if the job is not based in Bangalore/Bengaluru (remote-only roles count as not based there), looks like spam, a scam, a training course, a paid placement scheme, or an MLM; true otherwise.
- reason: a few words explaining keep=false, or "" when kept.
- area: the Bangalore area where the office is, chosen from the allowed list, only when the listing names it (or names a tech park inside it). Use "" when it doesn't say. Never guess from the company name alone.
- job_type: full-time, part-time, contract or internship.
- experience: required experience as written, e.g. "2-4 years" or "Fresher", max 60 characters, "" if not stated.
- salary: pay as written, e.g. "₹6-9 LPA", max 60 characters, "" if not stated.`;

const analyseWithClaude = async (jobs: RawJob[], apiKey: string): Promise<Analysis[]> => {
  const client = new Anthropic({ apiKey });
  const listings = jobs.map((j, index) => ({
    index,
    title: j.title,
    company: j.company,
    location: j.location,
    schedule: j.scheduleType,
    salary: j.salary,
    description: j.description.slice(0, 2000),
  }));

  const response = await client.messages.create({
    model: Deno.env.get('ANALYSIS_MODEL') ?? 'claude-haiku-5-5',
    max_tokens: 8000,
    system: SYSTEM,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: JSON.stringify(listings) }],
  });

  if (response.stop_reason === 'refusal') throw new Error('Analysis was refused');
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('Analysis returned no text');
  const parsed = JSON.parse(text.text) as {
    jobs: { index: number; keep: boolean; reason: string; area: string; job_type: JobType; experience: string; salary: string }[];
  };

  return jobs.map((job, index) => {
    const r = parsed.jobs.find((p) => p.index === index);
    if (!r) return analyseWithRules(job);
    return {
      keep: r.keep && !!job.title && !!job.company && !!job.applyUrl,
      reason: r.reason,
      area: findArea(r.area)?.name ?? '',
      jobType: JOB_TYPES.includes(r.job_type) ? r.job_type : guessJobType(job),
      experience: r.experience.slice(0, 60),
      salary: (r.salary || job.salary).slice(0, 60),
    };
  });
};

export const analyseJobs = async (jobs: RawJob[]): Promise<{ results: Analysis[]; usedClaude: boolean }> => {
  if (jobs.length === 0) return { results: [], usedClaude: false };
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (apiKey) {
    try {
      return { results: await analyseWithClaude(jobs, apiKey), usedClaude: true };
    } catch (e) {
      console.error('Claude analysis failed, using keyword rules:', e);
    }
  }
  return { results: jobs.map(analyseWithRules), usedClaude: false };
};
