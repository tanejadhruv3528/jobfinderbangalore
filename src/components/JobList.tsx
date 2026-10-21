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
  <div className="flex flex-col items-center px-6 py-12 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
      <Icon className="h-6 w-6 text-muted-foreground" />
    </div>
    <h3 className="mt-5 text-xl font-bold">{title}</h3>
    <p className="mt-1.5 max-w-[280px] text-sm text-muted-foreground">{body}</p>
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
}: JobListProps) => {
  const refs = useRef<Map<string, HTMLElement>>(new Map());

  // Keep the job hovered or picked on the map in view
  useEffect(() => {
    const id = hoveredJobId ?? activeJobId;
    if (id) refs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeJobId, hoveredJobId]);

  return (
    <div className={cn(scrollable && 'scrollbar-thin h-full overflow-y-auto')}>
      <div className="space-y-4 p-4">
        {header}

        {areas.length > 1 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Jump to an area</p>
            <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4">
              {areas.map((area) => (
                <button
                  key={area.name}
                  type="button"
                  onClick={() => onAreaJump(area)}
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-sm text-foreground/85 transition-all hover:border-primary/60 hover:text-foreground active:scale-95"
                >
                  {area.name}
                  <span className="rounded-full bg-white/10 px-1.5 text-[11px] font-semibold">{area.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-end justify-between gap-3 pt-1">
          <h2 className="text-2xl font-bold leading-none">
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
          <div className="flex rounded-full bg-white/[0.06] p-0.5 text-xs font-semibold">
            {(['nearest', 'newest'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSortChange(s)}
                className={cn(
                  'relative rounded-full px-3 py-1.5 capitalize transition-colors',
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

        <div className="space-y-2.5 pb-20 lg:pb-2">
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
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: Math.min(i, 8) * 0.04 } }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }}
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
              className="group relative mt-3 flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent p-5"
            >
              <div>
                <p className="font-display text-lg font-bold leading-tight">Hiring in Bangalore?</p>
                <p className="mt-1 text-sm text-foreground/70">Drop your job on the map for free. It goes live instantly.</p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary transition-transform duration-300 group-hover:translate-x-1 group-hover:rotate-[-8deg]">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobList;
