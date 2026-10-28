import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, MapPinOff, RotateCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import JobCard from '@/components/JobCard';
import JobCardSkeleton from '@/components/JobCardSkeleton';
import { CommuteMode } from '@/lib/commute';
import { Job, SortOrder } from '@/types';
import { cn } from '@/lib/utils';

export interface AreaCount {
  name: string;
  count: number;
  lat: number;
  lng: number;
}

interface JobListProps {
  jobs: Job[];
  distances: Map<string, number>;
  mode: CommuteMode;
  activeJobId: string | null;
  hoveredJobId: string | null;
  onJobOpen: (job: Job) => void;
  onJobHover: (jobId: string | null) => void;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  sort: SortOrder;
  onSortChange: (sort: SortOrder) => void;
  areas: AreaCount[];
  onAreaJump: (area: AreaCount) => void;
  /** Slot rendered above the results, used for the commute card */
  header?: React.ReactNode;
  scrollable?: boolean;
  /** The mobile sheet already shows the count in its handle */
  showCount?: boolean;
}

const EmptyState = ({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof WifiOff;
  title: string;
  body: string;
  action?: React.ReactNode;
}) => (
  <div className="px-3 py-10">
    <h3 className="flex items-center gap-2 text-xl font-bold">
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      {title}
    </h3>
    <p className="mt-1.5 max-w-[34ch] text-sm text-muted-foreground">{body}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

const JobList = ({
  jobs,
  distances,
  mode,
  activeJobId,
  hoveredJobId,
  onJobOpen,
  onJobHover,
  isLoading,
  error,
  onRetry,
  hasActiveFilters,
  onClearFilters,
  sort,
  onSortChange,
  areas,
  onAreaJump,
  header,
  scrollable = true,
  showCount = true,
}: JobListProps) => {
  const refs = useRef<Map<string, HTMLElement>>(new Map());

  // Keep the job hovered or picked on the map in view
  useEffect(() => {
    const id = hoveredJobId ?? activeJobId;
    if (id) refs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeJobId, hoveredJobId]);

  return (
    <div className={cn('overflow-x-clip', scrollable && 'scrollbar-thin h-full overflow-y-auto')}>
      <div className="space-y-5 px-4 pb-4 pt-5">
        {header}

        {areas.length > 1 && (
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Jump to an area</p>
            <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4">
              {areas.map((area) => (
                <button
                  key={area.name}
                  type="button"
                  onClick={() => onAreaJump(area)}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-border px-3.5 text-sm text-foreground/85 transition-colors duration-150 hover:border-foreground/40 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:bg-secondary"
                >
                  {area.name}
                  <span className="num text-xs font-semibold text-muted-foreground">{area.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={cn('flex items-center gap-3 border-t border-border pt-5', showCount ? 'justify-between' : 'justify-end')}>
          <h2 className={cn('text-2xl font-bold leading-none', !showCount && 'sr-only')}>
            {isLoading ? (
              'Finding jobs…'
            ) : error ? (
              'Jobs unavailable'
            ) : (
              <>
                <motion.span key={jobs.length} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-block">
                  {jobs.length}
                </motion.span>{' '}
                {jobs.length === 1 ? 'job' : 'jobs'}
              </>
            )}
          </h2>
          <div className="flex rounded-full bg-secondary p-0.5 text-xs font-semibold" role="group" aria-label="Sort jobs">
            {(['nearest', 'newest'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSortChange(s)}
                aria-pressed={sort === s}
                className={cn(
                  'relative h-8 rounded-full px-3.5 capitalize transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  sort === s ? 'text-ink-foreground' : 'text-foreground/60 hover:text-foreground',
                )}
              >
                {sort === s && (
                  <motion.span layoutId="sort-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
                )}
                <span className="relative">{s}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="-mx-1 pb-20 lg:pb-2">
          {isLoading ? (
            Array.from({ length: 4 }, (_, i) => <JobCardSkeleton key={i} />)
          ) : error ? (
            <EmptyState
              icon={WifiOff}
              title="Couldn't load jobs"
              body="Check your connection and try again."
              action={
                onRetry && (
                  <Button variant="outline" onClick={onRetry}>
                    <RotateCw />
                    Try again
                  </Button>
                )
              }
            />
          ) : jobs.length === 0 ? (
            <EmptyState
              icon={MapPinOff}
              title="Nothing in reach"
              body={hasActiveFilters ? 'Try a longer commute, another way to travel, or a different search.' : 'New jobs are pinned every day. Check back soon.'}
              action={
                hasActiveFilters && (
                  <Button variant="outline" onClick={onClearFilters}>
                    Clear filters
                  </Button>
                )
              }
            />
          ) : (
            <AnimatePresence initial={true} mode="popLayout">
              {jobs.map((job, i) => (
                <motion.div
                  key={job.id}
                  layout
                  className="border-b border-border/70 py-0.5 last:border-b-0"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.03 } }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <JobCard
                    ref={(el) => {
                      if (el) refs.current.set(job.id, el);
                      else refs.current.delete(job.id);
                    }}
                    job={job}
                    distance={distances.get(job.id)}
                    mode={mode}
                    isSelected={job.id === activeJobId}
                    isHovered={job.id === hoveredJobId}
                    onSelect={onJobOpen}
                    onHover={onJobHover}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {!isLoading && (
            <Link
              to="/post-a-job"
              className="group mx-1 mt-4 flex items-center justify-between gap-4 rounded-2xl border border-border p-5 transition-colors duration-150 hover:border-primary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div>
                <p className="font-display text-lg font-bold leading-tight">Hiring in Bangalore?</p>
                <p className="mt-1 text-sm text-foreground/70">Drop your job on the map for free. It goes live instantly.</p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-200 group-hover:translate-x-1">
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobList;
