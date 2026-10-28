import { forwardRef } from 'react';
import { MapPin, Star } from 'lucide-react';
import CompanyAvatar from '@/components/CompanyAvatar';
import { Job } from '@/types';
import { formatDistance } from '@/lib/distance';
import { CommuteMode, commuteMinutes } from '@/lib/commute';
import CommuteIcon from '@/components/CommuteIcon';
import { postedAgo } from '@/lib/format';
import { JOB_TYPE_LABELS } from '@/lib/jobTypes';
import { cn } from '@/lib/utils';

interface JobCardProps {
  job: Job;
  isSelected?: boolean;
  onSelect?: (job: Job) => void;
  distance?: number;
  mode?: CommuteMode;
  isHovered?: boolean;
  onHover?: (jobId: string | null) => void;
  className?: string;
  style?: React.CSSProperties;
}

const TYPE_TEXT: Record<string, string> = {
  'full-time': 'text-job-fulltime',
  'part-time': 'text-job-parttime',
  contract: 'text-job-contract',
  internship: 'text-job-internship',
};

/** The travel time leads the row, set like a departure board; past an hour the unit line reads "hours" so "1:16" isn't read as 1 hour plus a separate 16 minutes */
const Minutes = ({ minutes, mode, distance, active }: { minutes: number; mode: CommuteMode; distance: number; active: boolean }) => {
  const long = minutes >= 60;
  return (
    <div className="flex flex-col items-start pt-0.5" title={`${formatDistance(distance)} away`}>
      <span className={cn('num font-display text-[26px] font-bold leading-none', active ? 'text-primary' : 'text-foreground')}>
        {long ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}` : minutes}
      </span>
      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <CommuteIcon mode={mode} className="h-3.5 w-3.5" />
        {long ? 'hours' : 'min'}
      </span>
    </div>
  );
};

const JobCard = forwardRef<HTMLElement, JobCardProps>(
  ({ job, isSelected = false, onSelect, distance, mode = 'bike', isHovered = false, onHover, className, style }, ref) => {
    const companyName = job.company?.name || 'Company';
    const area = job.location?.address || job.location?.city;

    return (
      <article
        ref={ref}
        style={style}
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        onClick={() => onSelect?.(job)}
        onMouseEnter={() => onHover?.(job.id)}
        onMouseLeave={() => onHover?.(null)}
        onKeyDown={(e) => {
          if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onSelect(job);
          }
        }}
        aria-label={`${job.title} at ${companyName}`}
        aria-current={isSelected || undefined}
        className={cn(
          'grid grid-cols-[52px_minmax(0,1fr)] gap-3 rounded-xl px-3 py-3.5 text-left transition-colors duration-150',
          onSelect && 'cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:bg-secondary',
          isSelected ? 'bg-secondary' : isHovered ? 'bg-secondary/60' : onSelect && 'hover:bg-secondary/60',
          className,
        )}
      >
        {distance !== undefined ? (
          <Minutes minutes={commuteMinutes(distance, mode)} mode={mode} distance={distance} active={isSelected || isHovered} />
        ) : (
          <CompanyAvatar name={companyName} />
        )}

        <div className="min-w-0">
          <h3 className="font-sans text-[15px] font-semibold leading-snug tracking-normal text-foreground line-clamp-2">{job.title}</h3>
          <p className="mt-0.5 truncate text-sm text-foreground/75">{companyName}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {job.isFeatured && (
              <span className="flex items-center gap-1 font-semibold text-job-featured">
                <Star className="h-3 w-3 fill-current" />
                Featured
              </span>
            )}
            <span className={cn('font-semibold', TYPE_TEXT[job.jobType])}>{JOB_TYPE_LABELS[job.jobType] ?? job.jobType}</span>
            {area && (
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{area}</span>
              </span>
            )}
            {job.salary && <span className="text-foreground/80">₹ {job.salary.replace(/^₹\s*/, '')}</span>}
            <span className="ml-auto">{postedAgo(job.createdAt)}</span>
          </div>
        </div>
      </article>
    );
  },
);

JobCard.displayName = 'JobCard';

export default JobCard;
