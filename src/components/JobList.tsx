import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPinOff, RotateCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import JobCard from '@/components/JobCard';
import JobCardSkeleton from '@/components/JobCardSkeleton';
import { Job } from '@/types';

interface JobListProps {
  jobs: Job[];
  distances: Map<string, number>;
  activeJobId: string | null;
  onJobOpen: (job: Job) => void;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  subtitle: string;
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
  <div className="flex flex-col items-center px-6 py-16 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
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
  activeJobId,
  onJobOpen,
  isLoading,
  error,
  onRetry,
  hasActiveFilters,
  onClearFilters,
  subtitle,
}: JobListProps) => {
  const refs = useRef<Map<string, HTMLElement>>(new Map());

  // Keep the job picked on the map in view
  useEffect(() => {
    if (activeJobId) refs.current.get(activeJobId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeJobId]);

  return (
    <div className="scrollbar-thin h-full overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-border/70 bg-background/90 px-4 pb-3 pt-5 backdrop-blur md:px-5">
        <h1 className="text-2xl font-bold leading-tight">
          {isLoading ? 'Finding jobs…' : error ? 'Jobs unavailable' : `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'} near you`}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="space-y-2.5 p-4 pb-24 md:px-5 lg:pb-6">
        {isLoading ? (
          Array.from({ length: 5 }, (_, i) => <JobCardSkeleton key={i} />)
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
            title="No jobs match"
            body={hasActiveFilters ? 'Try a wider distance or a different search.' : 'New jobs are pinned every day. Check back soon.'}
            action={
              hasActiveFilters && (
                <Button variant="outline" onClick={onClearFilters}>
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          jobs.map((job, i) => (
            <JobCard
              key={job.id}
              ref={(el) => {
                if (el) refs.current.set(job.id, el);
                else refs.current.delete(job.id);
              }}
              job={job}
              distance={distances.get(job.id)}
              isSelected={job.id === activeJobId}
              onSelect={onJobOpen}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
            />
          ))
        )}

        {!isLoading && (
          <Link
            to="/post-a-job"
            className="group mt-4 flex items-center justify-between gap-4 overflow-hidden rounded-2xl bg-ink p-5 text-ink-foreground"
          >
            <div>
              <p className="font-display text-lg font-bold leading-tight">Hiring in Bangalore?</p>
              <p className="mt-1 text-sm text-ink-foreground/70">Pin your job on the map for free. It goes live instantly.</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default JobList;
