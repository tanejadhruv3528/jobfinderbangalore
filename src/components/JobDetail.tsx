import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Briefcase, Check, IndianRupee, Link2, MapPin, Navigation, Star, X } from 'lucide-react';
import CommuteIcon from '@/components/CommuteIcon';
import { COMMUTE_LABELS, CommuteMode, commuteMinutes, formatMinutes } from '@/lib/commute';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CompanyAvatar from '@/components/CompanyAvatar';
import { Job } from '@/types';
import { formatDistance } from '@/lib/distance';
import { directionsUrl, postedAgo } from '@/lib/format';
import { JOB_TYPE_BADGE, JOB_TYPE_LABELS } from '@/lib/jobTypes';
import { cn } from '@/lib/utils';

interface JobDetailProps {
  job: Job;
  distance?: number;
  mode?: CommuteMode;
  onClose: () => void;
  /** Close icon instead of a back arrow (used for the mobile full-screen sheet) */
  closeIcon?: boolean;
  className?: string;
}

const Fact = ({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) => (
  <div className="min-w-0">
    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </dt>
    <dd className="mt-1 text-[15px] font-semibold text-foreground">{value}</dd>
  </div>
);

const JobDetail = ({ job, distance, mode = 'bike', onClose, closeIcon = false, className }: JobDetailProps) => {
  const [copied, setCopied] = useState(false);
  const companyName = job.company?.name || 'Company';
  const area = job.location?.address || job.location?.city || 'Bangalore';

  const handleShare = async () => {
    const url = `${window.location.origin}/?job=${job.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${job.title} at ${companyName}`, url });
        return;
      } catch {
        // Fall back to copying when the share sheet is dismissed or unsupported
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', url);
    }
  };

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <Button variant="ghost" size="sm" onClick={onClose} className="-ml-1">
          {closeIcon ? <X /> : <ArrowLeft />}
          {closeIcon ? 'Close' : 'All jobs'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleShare}>
          {copied ? <Check /> : <Link2 />}
          {copied ? 'Link copied' : 'Share'}
        </Button>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <article className="px-5 pb-8 pt-6 md:px-6">
          <div className="flex items-center gap-3">
            <CompanyAvatar name={companyName} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{companyName}</p>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {area}
              </p>
            </div>
          </div>

          <h2 className="mt-5 text-[30px] font-bold leading-[1.08] text-foreground">{job.title}</h2>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {job.isFeatured && (
              <span className="flex items-center gap-1 font-semibold text-job-featured">
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                Featured
              </span>
            )}
            <Badge variant={JOB_TYPE_BADGE[job.jobType] ?? 'secondary'}>{JOB_TYPE_LABELS[job.jobType] ?? job.jobType}</Badge>
            <span className="text-muted-foreground">Posted {postedAgo(job.createdAt).toLowerCase()}</span>
          </div>

          {distance !== undefined && (
            <section aria-labelledby="reach-head" className="mt-7 border-t border-border pt-5">
              <div className="flex items-baseline justify-between">
                <h3 id="reach-head" className="flex items-center gap-1.5 font-sans text-sm font-medium tracking-normal text-muted-foreground">
                  <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                  From your home
                </h3>
                <span className="num text-sm text-muted-foreground">{formatDistance(distance)}</span>
              </div>
              <dl className="mt-3 grid grid-cols-3 divide-x divide-border">
                {(['walk', 'bike', 'car'] as const).map((m) => (
                  <div key={m} className="px-3 first:pl-0">
                    <dt className={cn('flex items-center gap-1.5 text-xs', m === mode ? 'text-primary' : 'text-muted-foreground')}>
                      <CommuteIcon mode={m} className="h-3.5 w-3.5" />
                      {COMMUTE_LABELS[m]}
                    </dt>
                    <dd className={cn('num mt-1 font-display text-2xl font-bold leading-none', m === mode ? 'text-primary' : 'text-foreground')}>
                      {formatMinutes(commuteMinutes(distance, m))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5">
            <Fact icon={IndianRupee} label="Salary" value={job.salary || 'Not disclosed'} />
            <Fact icon={Briefcase} label="Experience" value={job.experience || 'Not specified'} />
          </dl>

          <section aria-labelledby="role-head" className="mt-6 border-t border-border pt-5">
            <h3 id="role-head" className="text-lg font-bold">About the role</h3>
            <div className="mt-3 max-w-[65ch] whitespace-pre-line break-words text-[15px] leading-relaxed text-foreground/85">
              {job.description}
            </div>
          </section>

          {job.location && (
            <a
              href={directionsUrl(job.location.latitude, job.location.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 flex items-center justify-between gap-3 rounded-2xl border border-border p-4 transition-colors duration-150 hover:border-foreground/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:bg-secondary"
            >
              <span className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-semibold text-foreground">Get directions</span>
                  <span className="block text-xs text-muted-foreground">Opens Google Maps for {area}</span>
                </span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </a>
          )}
        </article>
      </div>

      <div className="pb-safe border-t border-border px-5 pt-4 md:px-6">
        <Button size="lg" className="w-full" asChild>
          <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
            Apply on {companyName.length > 22 ? 'company site' : companyName}
            <ArrowUpRight />
          </a>
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">You’ll apply directly with the employer.</p>
      </div>
    </div>
  );
};

export default JobDetail;
