import { Skeleton } from '@/components/ui/skeleton';

const JobCardSkeleton = () => (
  <div className="rounded-2xl border border-border bg-card p-4">
    <div className="flex items-start gap-3.5">
      <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3.5 w-1/2" />
        <div className="flex gap-1.5 pt-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  </div>
);

export default JobCardSkeleton;
