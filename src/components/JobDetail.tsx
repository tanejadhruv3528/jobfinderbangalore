import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Briefcase, Calendar, Check, IndianRupee, Link2, MapPin, Navigation, Star, X } from 'lucide-react';
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
  onClose: () => void;
  /** Close icon instead of a back arrow (used for the mobile full-screen sheet) */
  closeIcon?: boolean;
  className?: string;
}

const Fact = ({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) => (
  <div className="rounded-2xl border border-border bg-background/60 p-3.5">
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
  </div>
);

const JobDetail = ({ job, distance, onClose, closeIcon = false, className }: JobDetailProps) => {
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
    <div className={cn('flex h-full flex-col bg-card', className)}>
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
        <div className="animate-fade-up px-5 pb-8 pt-6 md:px-6">
          <div className="flex items-center gap-3">
            <CompanyAvatar name={companyName} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{companyName}</p>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {area}
              </p>
            </div>
          </div>

          <h2 className="mt-5 text-[28px] font-bold leading-[1.1] text-foreground">{job.title}</h2>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {job.isFeatured && (
              <Badge variant="featured">
                <Star className="h-3 w-3 fill-current" />
                Featured
              </Badge>
            )}
            <Badge variant={JOB_TYPE_BADGE[job.jobType] ?? 'secondary'}>
              {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
            </Badge>
            <span className="text-xs text-muted-foreground">Posted {postedAgo(job.createdAt).toLowerCase()}</span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <Fact icon={IndianRupee} label="Salary" value={job.salary || 'Not disclosed'} />
            <Fact icon={Briefcase} label="Experience" value={job.experience || 'Not specified'} />
            <Fact icon={Navigation} label="From you" value={distance !== undefined ? formatDistance(distance) : '—'} />
            <Fact icon={Calendar} label="Posted" value={postedAgo(job.createdAt)} />
          </div>

          <div className="mt-8">
            <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              About the role
            </h3>
            <div className="mt-3 whitespace-pre-line break-words text-[15px] leading-relaxed text-foreground/85">
              {job.description}
            </div>
          </div>

          {job.location && (
            <a
              href={directionsUrl(job.location.latitude, job.location.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 p-4 transition-colors hover:border-foreground/20"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <MapPin className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">Get directions</span>
                  <span className="block text-xs text-muted-foreground">Opens Google Maps · {area}</span>
                </span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </a>
          )}
        </div>
      </div>

      <div className="pb-safe border-t border-border bg-card/95 px-5 pt-4 backdrop-blur md:px-6">
        <Button size="lg" className="w-full" asChild>
          <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
            Apply on {companyName.length > 22 ? 'company site' : companyName}
            <ArrowUpRight />
          </a>
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">You'll apply directly with the employer.</p>
      </div>
    </div>
  );
};

export default JobDetail;
