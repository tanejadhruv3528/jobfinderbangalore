import { MapPin, Clock, IndianRupee, ExternalLink, Star, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Job } from '@/types';
import { forwardRef } from 'react';
import { formatDistance } from '@/lib/distance';
import { JOB_TYPE_LABELS } from '@/lib/jobTypes';

interface JobCardProps {
  job: Job;
  isHighlighted?: boolean;
  onSelect?: (job: Job) => void;
  distance?: number;
}

const getJobTypeBadgeVariant = (jobType: string) => {
  switch (jobType) {
    case 'full-time': return 'fulltime';
    case 'part-time': return 'parttime';
    case 'contract': return 'contract';
    case 'internship': return 'internship';
    default: return 'secondary';
  }
};

const JobCard = forwardRef<HTMLDivElement, JobCardProps>(
  ({ job, isHighlighted = false, onSelect, distance }, ref) => {
    const handleApply = (e: React.MouseEvent) => {
      e.stopPropagation();
      window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
    };

    return (
      <Card
        ref={ref}
        variant={job.isFeatured ? 'featured' : 'job'}
        className={`p-4 animate-fade-in transition-all duration-200 ${
          isHighlighted ? 'ring-2 ring-primary bg-primary/5' : ''
        }`}
        onClick={() => onSelect?.(job)}
      >
        <CardHeader className="p-0 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold leading-snug text-foreground">
                {job.title}
              </CardTitle>
              {job.company?.name && (
                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                  {job.company.name}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <Badge variant={getJobTypeBadgeVariant(job.jobType)}>
                {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
              </Badge>
              {job.isFeatured && (
                <Badge variant="featured" className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Featured
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-4 h-4 text-primary/80 flex-shrink-0" />
              <span className="truncate text-foreground/80">
                {job.location?.address || job.location?.city}
              </span>
            </span>
            {distance !== undefined && (
              <span className="flex items-center gap-1.5 text-primary font-medium">
                <Navigation className="w-4 h-4" />
                {formatDistance(distance)}
              </span>
            )}
            {job.salary && (
              <span className="flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4 text-muted-foreground/70" />
                {job.salary}
              </span>
            )}
            {job.experience && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-muted-foreground/70" />
                {job.experience}
              </span>
            )}
          </div>

          {isHighlighted && job.description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4 whitespace-pre-line">
              {job.description}
            </p>
          )}

          <Button variant="apply" className="w-full" onClick={handleApply}>
            Apply Now
            <ExternalLink className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }
);

JobCard.displayName = 'JobCard';

export default JobCard;
