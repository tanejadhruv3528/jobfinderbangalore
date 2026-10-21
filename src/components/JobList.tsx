import { Briefcase, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Job } from '@/types';
import JobCard from './JobCard';
import JobCardSkeleton from './JobCardSkeleton';
import { useEffect, useRef, useMemo } from 'react';
import { calculateDistance } from '@/lib/distance';

interface JobListProps {
  jobs: Job[];
  selectedLocationId: string | null;
  onJobSelect: (job: Job) => void;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  userLocation: { lat: number; lng: number } | null;
}

const JobList = ({ jobs, selectedLocationId, onJobSelect, isLoading, error, onRetry, userLocation }: JobListProps) => {
  const jobRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Calculate distances for each job
  const jobDistances = useMemo(() => {
    const distances = new Map<string, number>();
    if (!userLocation) return distances;
    
    jobs.forEach(job => {
      if (job.location?.latitude && job.location?.longitude) {
        const dist = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          job.location.latitude,
          job.location.longitude
        );
        distances.set(job.id, dist);
      }
    });
    return distances;
  }, [jobs, userLocation]);

  const featuredJobs = jobs.filter(job => job.isFeatured);
  const regularJobs = jobs.filter(job => !job.isFeatured);

  // Scroll to first highlighted job when selectedLocationId changes
  useEffect(() => {
    if (!selectedLocationId) return;

    const firstMatchingJob = jobs.find(job => job.locationId === selectedLocationId);
    if (firstMatchingJob) {
      const element = jobRefs.current.get(firstMatchingJob.id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedLocationId, jobs]);

  const setJobRef = (jobId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      jobRefs.current.set(jobId, el);
    } else {
      jobRefs.current.delete(jobId);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-5 h-5 text-primary" />
            <span className="font-semibold text-base text-muted-foreground">Loading jobs...</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <JobCardSkeleton isCompact />
          <JobCardSkeleton isCompact />
          <JobCardSkeleton isCompact />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <Briefcase className="w-5 h-5 text-primary" />
          <span className="font-semibold text-base">
            {error ? 'Jobs unavailable' : `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'} in Bangalore`}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-5">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Couldn't load jobs</h3>
            <p className="text-sm text-muted-foreground max-w-[240px] mb-5">
              Check your connection and try again.
            </p>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Try again
              </Button>
            )}
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-5">
              <Briefcase className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No jobs found</h3>
            <p className="text-sm text-muted-foreground max-w-[200px]">
              Try a larger distance or clear your search
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Featured jobs first */}
            {featuredJobs.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1">
                  Featured
                </p>
                {featuredJobs.map(job => (
                  <JobCard
                    key={job.id}
                    ref={setJobRef(job.id)}
                    job={job}
                    isHighlighted={job.locationId === selectedLocationId}
                    onSelect={onJobSelect}
                    distance={jobDistances.get(job.id)}
                  />
                ))}
              </>
            )}

            {/* Regular jobs */}
            {regularJobs.length > 0 && (
              <>
                {featuredJobs.length > 0 && (
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-6 pb-1">
                    All Jobs
                  </p>
                )}
                {regularJobs.map(job => (
                  <JobCard
                    key={job.id}
                    ref={setJobRef(job.id)}
                    job={job}
                    isHighlighted={job.locationId === selectedLocationId}
                    onSelect={onJobSelect}
                    distance={jobDistances.get(job.id)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobList;