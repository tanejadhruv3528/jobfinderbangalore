import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface JobCardSkeletonProps {
  isCompact?: boolean;
}

const JobCardSkeleton = ({ isCompact = false }: JobCardSkeletonProps) => {
  return (
    <Card className={`${isCompact ? 'p-3' : ''} animate-pulse`}>
      <CardHeader className={isCompact ? 'p-0 pb-3' : 'pb-4'}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Job title skeleton */}
            <Skeleton className="h-5 w-48 max-w-full" />
            {/* Company name skeleton */}
            <Skeleton className="h-4 w-32 max-w-full" />
          </div>
          {/* Job type badge skeleton */}
          <Skeleton className="h-6 w-20 rounded-full flex-shrink-0" />
        </div>
      </CardHeader>

      <CardContent className={isCompact ? 'p-0' : 'pt-0'}>
        <div className="space-y-4">
          {/* Meta info row skeleton */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>

          {!isCompact && (
            <>
              {/* Role skeleton */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-36" />
              </div>

              {/* Description skeleton */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </>
          )}

          {/* Apply button skeleton */}
          <Skeleton className={`h-10 w-full rounded-lg ${isCompact ? 'mt-3' : 'mt-2'}`} />
        </div>
      </CardContent>
    </Card>
  );
};

export default JobCardSkeleton;
