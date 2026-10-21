import { useEffect, useRef, useState } from 'react';
import { Loader2, LocateFixed, Minus, Plus } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Job } from '@/types';
import { initials } from '@/lib/format';
import { BANGALORE_CENTER } from '@/lib/distance';
import { cn } from '@/lib/utils';

// Mapbox public access token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoidGFuZWphLWRocnV2IiwiYSI6ImNtazFrYmw0NzA1OWUzZHF3NWczYnN0NHcifQ.-ZdRZgv8qdygmFOjPQwY2w';

const DEFAULT_ZOOM = 11;

const PIN_SVG = `<svg viewBox="0 0 34 42"><path class="jp-pin-body" d="M17 1.5C8.4 1.5 1.5 8.3 1.5 16.8c0 10.6 13.2 22 14.4 23a1.7 1.7 0 0 0 2.2 0c1.2-1 14.4-12.4 14.4-23C32.5 8.3 25.6 1.5 17 1.5Z"/></svg>`;

interface JobMapProps {
  jobs: Job[];
  selectedJobId: string | null;
  onJobSelect: (jobId: string | null) => void;
  userLocation: { lat: number; lng: number } | null;
  /** Space in px covered by overlays at the bottom, kept clear when centring a pin */
  bottomInset?: number;
  className?: string;
}

const iconButton =
  'flex h-10 w-10 items-center justify-center bg-card text-foreground transition-colors hover:bg-secondary disabled:opacity-60';

const JobMap = ({ jobs, selectedJobId, onJobSelect, userLocation, bottomInset = 0, className }: JobMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: mapboxgl.Marker; element: HTMLDivElement }>>(new Map());
  const meMarker = useRef<mapboxgl.Marker | null>(null);
  const onSelectRef = useRef(onJobSelect);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  onSelectRef.current = onJobSelect;

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [BANGALORE_CENTER.lng, BANGALORE_CENTER.lat],
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      // Keep the logo clear of the job cards that float over the bottom of the map on phones
      logoPosition: 'top-left',
    });

    map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'top-left');
    map.current.on('load', () => setMapLoaded(true));
    map.current.on('click', (e) => {
      // Clicks on markers are handled by the marker; empty map clears the selection
      if (!(e.originalEvent.target as HTMLElement).closest('.jp-pin')) onSelectRef.current(null);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Rebuild markers when the job set changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current.clear();

    jobs.forEach((job) => {
      const lat = job.location?.latitude;
      const lng = job.location?.longitude;
      if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return;

      // Mapbox positions the outer element with a transform, so animations go on the inner pin
      const wrapper = document.createElement('div');
      const el = document.createElement('div');
      el.className = cn('jp-pin', job.isFeatured && 'is-featured');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `${job.title} at ${job.company?.name ?? 'company'}`);
      el.innerHTML = PIN_SVG;
      wrapper.appendChild(el);

      const label = document.createElement('span');
      label.className = 'jp-pin-label';
      label.textContent = initials(job.company?.name || job.title);
      el.appendChild(label);

      const tag = document.createElement('span');
      tag.className = 'jp-pin-tag';
      tag.textContent = job.title;
      el.appendChild(tag);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectRef.current(job.id);
      });

      const marker = new mapboxgl.Marker({ element: wrapper, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map.current!);
      markersRef.current.set(job.id, { marker, element: el });
    });
  }, [jobs, mapLoaded]);

  // Highlight and centre the selected pin
  useEffect(() => {
    markersRef.current.forEach(({ element }, jobId) => {
      element.classList.toggle('is-selected', jobId === selectedJobId);
      (element.parentElement as HTMLElement).style.zIndex = jobId === selectedJobId ? '10' : '';
    });

    if (!selectedJobId || !map.current) return;
    const job = jobs.find((j) => j.id === selectedJobId);
    if (job?.location) {
      map.current.easeTo({
        center: [job.location.longitude, job.location.latitude],
        zoom: Math.max(map.current.getZoom(), bottomInset ? 12 : 13),
        padding: { top: 40, bottom: bottomInset + 40, left: 40, right: 40 },
        duration: 600,
      });
    }
  }, [selectedJobId, jobs, mapLoaded, bottomInset]);

  // Visitor position
  useEffect(() => {
    if (!map.current || !mapLoaded || !userLocation) return;
    if (!meMarker.current) {
      const el = document.createElement('div');
      el.className = 'jp-me';
      el.title = 'You are here';
      meMarker.current = new mapboxgl.Marker({ element: el }).setLngLat([userLocation.lng, userLocation.lat]).addTo(map.current);
    } else {
      meMarker.current.setLngLat([userLocation.lng, userLocation.lat]);
    }
  }, [userLocation, mapLoaded]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        map.current?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 13.5 });
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { timeout: 10000 },
    );
  };

  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-[#f2efe9]', className)}>
      <div ref={mapContainer} className="absolute inset-0" />

      <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border shadow-soft">
          <button type="button" className={iconButton} onClick={() => map.current?.zoomIn()} aria-label="Zoom in">
            <Plus className="h-4 w-4" />
          </button>
          <div className="h-px bg-border" />
          <button type="button" className={iconButton} onClick={() => map.current?.zoomOut()} aria-label="Zoom out">
            <Minus className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          className={cn(iconButton, 'rounded-2xl border border-border shadow-soft')}
          onClick={handleLocateMe}
          disabled={isLocating}
          aria-label="Show my location"
        >
          {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

export default JobMap;
