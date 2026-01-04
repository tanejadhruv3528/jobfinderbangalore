import { Briefcase, List, Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Job } from '@/types';
import JobCard from './JobCard';
import { useState } from 'react';

interface JobListProps {
  jobs: Job[];
  selectedJob: Job | null;
  onJobSelect: (job: Job) => void;
}

const JobList = ({ jobs, selectedJob, onJobSelect }: JobListProps) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const featuredJobs = jobs.filter(job => job.isFeatured);
  const regularJobs = jobs.filter(job => !job.isFeatured);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          <span className="font-semibold">{jobs.length} Jobs Found</span>
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

      <div className="flex-1 overflow-y-auto p-4">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No jobs found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <div className={`space-y-4 ${viewMode === 'grid' ? 'grid grid-cols-1 gap-4 space-y-0' : ''}`}>
            {/* Featured jobs first */}
            {featuredJobs.length > 0 && (
              <>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Featured
                </p>
                {featuredJobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isCompact={viewMode === 'list'}
                    onSelect={onJobSelect}
                  />
                ))}
              </>
            )}

            {/* Regular jobs */}
            {regularJobs.length > 0 && (
              <>
                {featuredJobs.length > 0 && (
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-4">
                    All Jobs
                  </p>
                )}
                {regularJobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isCompact={viewMode === 'list'}
                    onSelect={onJobSelect}
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
