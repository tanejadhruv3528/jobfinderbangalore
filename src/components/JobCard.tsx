import { forwardRef } from 'react';
import { Briefcase, IndianRupee, Navigation, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import CompanyAvatar from '@/components/CompanyAvatar';
import { Job } from '@/types';
import { formatDistance } from '@/lib/distance';
import { postedAgo } from '@/lib/format';
import { JOB_TYPE_BADGE, JOB_TYPE_LABELS } from '@/lib/jobTypes';
import { cn } from '@/lib/utils';

interface JobCardProps {
  job: Job;
  isSelected?: boolean;
  onSelect?: (job: Job) => void;
  distance?: number;
  className?: string;
  style?: React.CSSProperties;
}

const JobCard = forwardRef<HTMLElement, JobCardProps>(
  ({ job, isSelected = false, onSelect, distance, className, style }, ref) => {
    const companyName = job.company?.name || 'Company';
    const area = job.location?.address || job.location?.city;

    return (
      <article
        ref={ref}
        style={style}
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        onClick={() => onSelect?.(job)}
        onKeyDown={(e) => {
          if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onSelect(job);
          }
        }}
        aria-label={`${job.title} at ${companyName}`}
        className={cn(
          'group relative rounded-2xl border bg-card p-4 text-left transition-all duration-200',
          onSelect && 'cursor-pointer hover:border-foreground/20 hover:shadow-lift focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20',
          isSelected ? 'border-primary shadow-lift ring-4 ring-primary/10' : 'border-border shadow-sm',
          className,
        )}
      >
        <div className="flex items-start gap-3.5">
          <CompanyAvatar name={companyName} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-sans text-[15px] font-semibold leading-snug text-foreground line-clamp-2">
                {job.title}
              </h3>
              {distance !== undefined && (
                <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
                  <Navigation className="h-3 w-3 fill-current" />
                  {formatDistance(distance)}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {companyName}
              {area && (
                <>
                  <span className="mx-1.5 text-border">•</span>
                  {area}
                </>
              )}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {job.isFeatured && (
                <Badge variant="featured">
                  <Star className="h-3 w-3 fill-current" />
                  Featured
                </Badge>
              )}
              <Badge variant={JOB_TYPE_BADGE[job.jobType] ?? 'secondary'}>
                {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
              </Badge>
              {job.salary && (
                <Badge variant="secondary" className="font-medium">
                  <IndianRupee className="h-3 w-3" />
                  {job.salary}
                </Badge>
              )}
              {job.experience && (
                <Badge variant="secondary" className="font-medium">
                  <Briefcase className="h-3 w-3" />
                  {job.experience}
                </Badge>
              )}
              <span className="ml-auto pl-1 text-xs text-muted-foreground">{postedAgo(job.createdAt)}</span>
            </div>
          </div>
        </div>
      </article>
    );
  },
);

JobCard.displayName = 'JobCard';

export default JobCard;
