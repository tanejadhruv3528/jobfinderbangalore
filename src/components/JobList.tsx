import { Briefcase, List, Grid, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Job } from '@/types';
import JobCard from './JobCard';
import { useState, useEffect, useRef, useMemo } from 'react';
import { calculateDistance, formatDistance } from '@/lib/distance';

interface JobListProps {
  jobs: Job[];
  selectedLocationId: string | null;
  onJobSelect: (job: Job) => void;
  isLoading?: boolean;
  userLocation: { lat: number; lng: number } | null;
}

const JobList = ({ jobs, selectedLocationId, onJobSelect, isLoading, userLocation }: JobListProps) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
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
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <Briefcase className="w-5 h-5 text-primary" />
          <span className="font-semibold text-base">{jobs.length} Jobs Found</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-5">
              <Briefcase className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No jobs found</h3>
            <p className="text-sm text-muted-foreground max-w-[200px]">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <div className={`space-y-5 ${viewMode === 'grid' ? 'grid grid-cols-1 gap-5 space-y-0' : ''}`}>
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
                    isCompact={viewMode === 'list'}
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
                    isCompact={viewMode === 'list'}
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