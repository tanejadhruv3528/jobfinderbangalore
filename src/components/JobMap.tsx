import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Job } from '@/types';
import JobCard from './JobCard';

interface JobMapProps {
  jobs: Job[];
  selectedJob: Job | null;
  onJobSelect: (job: Job | null) => void;
  userLocation: { lat: number; lng: number } | null;
}

const JobMap = ({ jobs, selectedJob, onJobSelect, userLocation }: JobMapProps) => {
  const [isLocating, setIsLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState(userLocation || { lat: 37.7749, lng: -122.4194 });

  const handleLocateMe = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsLocating(false);
        },
        () => setIsLocating(false)
      );
    }
  };

  // Group jobs by location
  const jobsByLocation = jobs.reduce((acc, job) => {
    if (!job.location) return acc;
    const key = `${job.location.latitude}-${job.location.longitude}`;
    if (!acc[key]) {
      acc[key] = {
        location: job.location,
        jobs: [],
      };
    }
    acc[key].jobs.push(job);
    return acc;
  }, {} as Record<string, { location: NonNullable<Job['location']>; jobs: Job[] }>);

  return (
    <div className="relative w-full h-full bg-muted rounded-xl overflow-hidden">
      {/* Map placeholder with grid */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-muted">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
        
        {/* Decorative map elements */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow animate-pulse-soft">
              <MapPin className="w-12 h-12 text-primary-foreground" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              Map integration ready
            </p>
            <p className="text-muted-foreground/70 text-xs mt-1">
              Add your Mapbox token to enable
            </p>
          </div>
        </div>

        {/* Job markers */}
        {Object.entries(jobsByLocation).map(([key, { location, jobs: locationJobs }]) => {
          const hasFeatured = locationJobs.some(j => j.isFeatured);
          const offsetX = (location.longitude + 122.5) * 300;
          const offsetY = (37.9 - location.latitude) * 500;
          
          return (
            <button
              key={key}
              className={`absolute job-marker ${hasFeatured ? 'featured' : ''}`}
              style={{
                left: `${Math.max(5, Math.min(90, 20 + offsetX))}%`,
                top: `${Math.max(10, Math.min(85, 20 + offsetY))}%`,
              }}
              onClick={() => onJobSelect(locationJobs[0])}
            >
              <span className="job-marker-count">{locationJobs.length}</span>
            </button>
          );
        })}
      </div>

      {/* Locate me button */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute bottom-4 right-4 shadow-lg"
        onClick={handleLocateMe}
        disabled={isLocating}
      >
        {isLocating ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Navigation className="w-5 h-5" />
        )}
      </Button>

      {/* Selected job popup */}
      {selectedJob && (
        <div className="absolute bottom-4 left-4 right-16 max-w-md animate-slide-up">
          <JobCard 
            job={selectedJob} 
            onSelect={() => {}} 
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => onJobSelect(null)}
          >
            ×
          </Button>
        </div>
      )}
    </div>
  );
};

export default JobMap;
