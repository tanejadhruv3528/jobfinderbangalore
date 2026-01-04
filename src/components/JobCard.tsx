import { MapPin, Clock, DollarSign, Briefcase, ExternalLink, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Job } from '@/types';

interface JobCardProps {
  job: Job;
  isCompact?: boolean;
  onSelect?: (job: Job) => void;
}

const getJobTypeBadgeVariant = (jobType: string) => {
  switch (jobType) {
    case 'full-time': return 'fulltime';
    case 'part-time': return 'parttime';
    case 'contract': return 'contract';
    case 'remote': return 'remote';
    default: return 'secondary';
  }
};

const JobCard = ({ job, isCompact = false, onSelect }: JobCardProps) => {
  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card 
      variant={job.isFeatured ? 'featured' : 'job'}
      className={`${isCompact ? 'p-3' : ''} animate-fade-in`}
      onClick={() => onSelect?.(job)}
    >
      <CardHeader className={isCompact ? 'p-0 pb-2' : ''}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {job.company?.logo && (
              <img 
                src={job.company.logo} 
                alt={job.company.name}
                className="w-12 h-12 rounded-lg object-cover bg-muted"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">{job.title}</CardTitle>
                {job.isFeatured && (
                  <Badge variant="featured" className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Featured
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {job.company?.name}
              </p>
            </div>
          </div>
          <Badge variant={getJobTypeBadgeVariant(job.jobType)}>
            {job.jobType}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className={isCompact ? 'p-0' : ''}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              {job.location?.city}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {job.experience}
            </span>
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              {job.salary}
            </span>
          </div>

          {!isCompact && (
            <>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{job.role}</span>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2">
                {job.description}
              </p>

              <Button 
                variant="apply" 
                className="w-full mt-4"
                onClick={handleApply}
              >
                Apply Now
                <ExternalLink className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default JobCard;
