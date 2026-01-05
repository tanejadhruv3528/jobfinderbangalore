import { useEffect, useRef, useState } from 'react';
import { Navigation, Loader2 } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Job } from '@/types';
import JobCard from './JobCard';

// Mapbox public access token
const MAPBOX_TOKEN = 'pk.eyJ1IjoidGFuZWphLWRocnV2IiwiYSI6ImNtazFrYmw0NzA1OWUzZHF3NWczYnN0NHcifQ.-ZdRZgv8qdygmFOjPQwY2w';

// Default center: Bangalore, India
const DEFAULT_CENTER: [number, number] = [77.5946, 12.9716]; // [lng, lat]
const DEFAULT_ZOOM = 11;

interface JobMapProps {
  jobs: Job[];
  selectedJob: Job | null;
  onJobSelect: (job: Job | null) => void;
  userLocation: { lat: number; lng: number } | null;
}

const JobMap = ({ jobs, selectedJob, onJobSelect, userLocation }: JobMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Group jobs by location
  const jobsByLocation = jobs.reduce((acc, job) => {
    if (!job.location) return acc;
    const lat = Number(job.location.latitude);
    const lng = Number(job.location.longitude);
    if (isNaN(lat) || isNaN(lng)) return acc;
    
    const key = `${lat}-${lng}`;
    if (!acc[key]) {
      acc[key] = {
        lat,
        lng,
        jobs: [],
      };
    }
    acc[key].jobs.push(job);
    return acc;
  }, {} as Record<string, { lat: number; lng: number; jobs: Job[] }>);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update markers when jobs change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    Object.entries(jobsByLocation).forEach(([key, { lat, lng, jobs: locationJobs }]) => {
      const el = document.createElement('div');
      el.className = 'mapbox-marker';
      el.style.cssText = `
        width: 32px;
        height: 32px;
        background: hsl(var(--primary));
        border-radius: 50%;
        border: 3px solid hsl(var(--background));
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: hsl(var(--primary-foreground));
        font-weight: 600;
        font-size: 12px;
      `;
      el.textContent = locationJobs.length > 1 ? String(locationJobs.length) : '';

      el.addEventListener('click', () => {
        onJobSelect(locationJobs[0]);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [jobs, mapLoaded, onJobSelect]);

  // Handle locate me
  const handleLocateMe = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.current?.flyTo({
            center: [longitude, latitude],
            zoom: 13,
          });
          setIsLocating(false);
        },
        () => setIsLocating(false)
      );
    } else {
      setIsLocating(false);
    }
  };

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Locate me button */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute bottom-4 right-4 shadow-lg z-10"
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
        <div className="absolute bottom-4 left-4 right-16 max-w-md z-10 animate-slide-up">
          <JobCard job={selectedJob} onSelect={() => {}} />
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
