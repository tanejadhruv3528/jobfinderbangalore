import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Compass, Loader2, LocateFixed, Minus, Plus } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Job } from '@/types';
import { initials } from '@/lib/format';
import { BANGALORE_CENTER } from '@/lib/distance';
import { circlePolygon } from '@/lib/commute';
import { cn } from '@/lib/utils';

// Mapbox public access token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoidGFuZWphLWRocnV2IiwiYSI6ImNtazFrYmw0NzA1OWUzZHF3NWczYnN0NHcifQ.-ZdRZgv8qdygmFOjPQwY2w';

const PIN_SVG = `<svg viewBox="0 0 34 42"><path class="jp-pin-body" d="M17 1.5C8.4 1.5 1.5 8.3 1.5 16.8c0 10.6 13.2 22 14.4 23a1.7 1.7 0 0 0 2.2 0c1.2-1 14.4-12.4 14.4-23C32.5 8.3 25.6 1.5 17 1.5Z"/></svg>`;
const HOME_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/></svg>`;

const INTRO_CAMERA = { zoom: 12.3, pitch: 62, bearing: -20 };
const EXPLORE_CAMERA = { zoom: 12.4, pitch: 48, bearing: -12 };

/** The Standard style's lighting follows the time of day in Bangalore */
function lightPreset(): 'dawn' | 'day' | 'dusk' | 'night' {
  const hour = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }));
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 19) return 'dusk';
  return 'night';
}

type LatLng = { lat: number; lng: number };

export interface JobMapHandle {
  flyTo: (point: LatLng, zoom?: number) => void;
}

interface JobMapProps {
  /** Every job; markers are built once per set so filtering never re-drops pins */
  jobs: Job[];
  /** Jobs matching the search and type filters; others are hidden */
  matchIds: Set<string>;
  /** Jobs inside the commute radius, or null when no radius is set */
  reachIds: Set<string> | null;
  selectedJobId: string | null;
  hoveredJobId: string | null;
  onJobSelect: (jobId: string | null) => void;
  onJobHover: (jobId: string | null) => void;
  home: LatLng;
  onHomeChange: (home: LatLng) => void;
  /** Commute radius in km around home; 0 hides it */
  radiusKm: number;
  /** While true the camera slowly orbits the city behind the intro screen */
  intro: boolean;
  /** Screen space covered by floating panels, kept clear when centring a pin */
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
  controlsClassName?: string;
}

const iconButton =
  'flex h-10 w-10 items-center justify-center text-foreground/85 transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-60';

const JobMap = forwardRef<JobMapHandle, JobMapProps>(
  (
    {
      jobs,
      matchIds,
      reachIds,
      selectedJobId,
      hoveredJobId,
      onJobSelect,
      onJobHover,
      home,
      onHomeChange,
      radiusKm,
      intro,
      padding = {},
      controlsClassName,
    },
    ref,
  ) => {
    const container = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const markers = useRef<Map<string, HTMLDivElement>>(new Map());
    const homeMarker = useRef<mapboxgl.Marker | null>(null);
    const callbacks = useRef({ onJobSelect, onJobHover, onHomeChange });
    const paddingRef = useRef(padding);
    const [loaded, setLoaded] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    callbacks.current = { onJobSelect, onJobHover, onHomeChange };
    paddingRef.current = padding;

    const cameraPadding = () => ({
      top: (paddingRef.current.top ?? 0) + 40,
      bottom: (paddingRef.current.bottom ?? 0) + 40,
      left: (paddingRef.current.left ?? 0) + 40,
      right: (paddingRef.current.right ?? 0) + 40,
    });

    useImperativeHandle(ref, () => ({
      flyTo: (point, zoom = 14) =>
        map.current?.flyTo({ center: [point.lng, point.lat], zoom, pitch: EXPLORE_CAMERA.pitch, padding: cameraPadding(), duration: 1800, essential: true }),
    }));

    // Initialise the map
    useEffect(() => {
      if (!container.current || map.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const m = new mapboxgl.Map({
        container: container.current,
        style: 'mapbox://styles/mapbox/standard',
        center: [BANGALORE_CENTER.lng, BANGALORE_CENTER.lat],
        ...INTRO_CAMERA,
        attributionControl: false,
        logoPosition: 'bottom-right',
      });
      map.current = m;

      m.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

      m.on('style.load', () => {
        try {
          m.setConfigProperty('basemap', 'lightPreset', lightPreset());
          m.setConfigProperty('basemap', 'showPointOfInterestLabels', false);
        } catch {
          // Only the Standard style has these settings
        }
      });

      m.on('load', () => {
        m.addSource('reach', { type: 'geojson', data: circlePolygon(BANGALORE_CENTER, 0.01) });
        m.addLayer({
          id: 'reach-fill',
          type: 'fill',
          source: 'reach',
          slot: 'top',
          paint: { 'fill-color': '#f5603a', 'fill-opacity': 0.1 },
          layout: { visibility: 'none' },
        } as mapboxgl.LayerSpecification);
        m.addLayer({
          id: 'reach-line',
          type: 'line',
          source: 'reach',
          slot: 'top',
          paint: { 'line-color': '#f5603a', 'line-width': 2.5, 'line-dasharray': [2, 1.5], 'line-opacity': 0.9 },
          layout: { visibility: 'none' },
        } as mapboxgl.LayerSpecification);
        setLoaded(true);
      });

      m.on('click', (e) => {
        if (!(e.originalEvent.target as HTMLElement).closest('.jp-pin')) callbacks.current.onJobSelect(null);
      });

      // Right-click (or long-press on touch) moves home to that spot
      m.on('contextmenu', (e) => callbacks.current.onHomeChange({ lat: e.lngLat.lat, lng: e.lngLat.lng }));

      return () => {
        m.remove();
        map.current = null;
      };
    }, []);

    // Slow orbit behind the intro; stops as soon as the visitor touches the map
    useEffect(() => {
      const m = map.current;
      if (!m || !loaded) return;
      if (!intro) {
        m.easeTo({ ...EXPLORE_CAMERA, center: [home.lng, home.lat], padding: cameraPadding(), duration: 2200, essential: true });
        return;
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      let frame = 0;
      let stopped = false;
      const spin = () => {
        if (stopped) return;
        m.setBearing(m.getBearing() + 0.035);
        frame = requestAnimationFrame(spin);
      };
      const stop = () => {
        stopped = true;
        cancelAnimationFrame(frame);
      };
      frame = requestAnimationFrame(spin);
      m.on('mousedown', stop);
      m.on('touchstart', stop);
      m.on('wheel', stop);
      return () => {
        stop();
        m.off('mousedown', stop);
        m.off('touchstart', stop);
        m.off('wheel', stop);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [intro, loaded]);

    // Build pins once per job set, with a staggered drop-in
    useEffect(() => {
      const m = map.current;
      if (!m || !loaded) return;
      const created: mapboxgl.Marker[] = [];
      markers.current.clear();

      jobs.forEach((job, i) => {
        const lat = job.location?.latitude;
        const lng = job.location?.longitude;
        if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return;

        const wrapper = document.createElement('div');
        const pin = document.createElement('div');
        pin.className = cn('jp-pin', job.isFeatured && 'is-featured');
        pin.setAttribute('role', 'button');
        pin.setAttribute('aria-label', `${job.title} at ${job.company?.name ?? 'company'}`);

        const inner = document.createElement('div');
        inner.className = 'jp-pin-inner';
        inner.style.setProperty('--drop-delay', `${400 + Math.min(i, 30) * 70}ms`);
        inner.innerHTML = PIN_SVG;

        const label = document.createElement('span');
        label.className = 'jp-pin-label';
        label.textContent = initials(job.company?.name || job.title);
        inner.appendChild(label);

        const tag = document.createElement('span');
        tag.className = 'jp-pin-tag';
        tag.textContent = job.title;
        inner.appendChild(tag);

        pin.appendChild(inner);
        wrapper.appendChild(pin);

        pin.addEventListener('click', (e) => {
          e.stopPropagation();
          callbacks.current.onJobSelect(job.id);
        });
        pin.addEventListener('mouseenter', () => callbacks.current.onJobHover(job.id));
        pin.addEventListener('mouseleave', () => callbacks.current.onJobHover(null));

        created.push(new mapboxgl.Marker({ element: wrapper, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(m));
        markers.current.set(job.id, pin);
      });

      return () => created.forEach((marker) => marker.remove());
    }, [jobs, loaded]);

    // Reflect filters, reach, hover and selection on the pins
    useEffect(() => {
      markers.current.forEach((pin, id) => {
        const visible = matchIds.has(id);
        pin.style.display = visible ? '' : 'none';
        pin.classList.toggle('is-far', !!reachIds && !reachIds.has(id) && id !== selectedJobId);
        pin.classList.toggle('is-hover', id === hoveredJobId && id !== selectedJobId);
        pin.classList.toggle('is-selected', id === selectedJobId);
        (pin.parentElement as HTMLElement).style.zIndex = id === selectedJobId ? '20' : id === hoveredJobId ? '10' : '';
      });
    }, [matchIds, reachIds, hoveredJobId, selectedJobId, jobs, loaded]);

    // Fly to the selected job
    useEffect(() => {
      const m = map.current;
      if (!m || !loaded || !selectedJobId) return;
      const job = jobs.find((j) => j.id === selectedJobId);
      if (!job?.location) return;
      m.flyTo({
        center: [job.location.longitude, job.location.latitude],
        zoom: Math.max(m.getZoom(), 14),
        pitch: 55,
        padding: cameraPadding(),
        duration: 1400,
        essential: true,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedJobId, loaded]);

    // Draggable home marker
    useEffect(() => {
      const m = map.current;
      if (!m || !loaded) return;
      if (!homeMarker.current) {
        const el = document.createElement('div');
        el.className = 'jp-home';
        el.innerHTML = `<div class="jp-home-core">${HOME_ICON}</div><span class="jp-home-label">Home · drag me</span>`;
        const marker = new mapboxgl.Marker({ element: el, draggable: true }).setLngLat([home.lng, home.lat]).addTo(m);
        let frame = 0;
        marker.on('dragstart', () => el.classList.add('is-dragging'));
        marker.on('drag', () => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            const { lat, lng } = marker.getLngLat();
            callbacks.current.onHomeChange({ lat, lng });
          });
        });
        marker.on('dragend', () => el.classList.remove('is-dragging'));
        homeMarker.current = marker;
      } else {
        homeMarker.current.setLngLat([home.lng, home.lat]);
      }
    }, [home, loaded]);

    // Commute radius around home
    useEffect(() => {
      const m = map.current;
      if (!m || !loaded) return;
      const source = m.getSource('reach') as mapboxgl.GeoJSONSource | undefined;
      const visibility = radiusKm > 0 ? 'visible' : 'none';
      m.setLayoutProperty('reach-fill', 'visibility', visibility);
      m.setLayoutProperty('reach-line', 'visibility', visibility);
      if (radiusKm > 0) source?.setData(circlePolygon(home, radiusKm));
    }, [home, radiusKm, loaded]);

    const handleLocateMe = () => {
      if (!navigator.geolocation) return;
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const point = { lat: coords.latitude, lng: coords.longitude };
          callbacks.current.onHomeChange(point);
          map.current?.flyTo({ center: [point.lng, point.lat], zoom: 14, padding: cameraPadding(), essential: true });
          setIsLocating(false);
        },
        () => setIsLocating(false),
        { timeout: 10000 },
      );
    };

    return (
      <div className="relative h-full w-full overflow-hidden bg-[hsl(230_24%_10%)]">
        <div ref={container} className="absolute inset-0" />

        <div
          className={cn(
            'absolute z-10 flex flex-col gap-2 transition-opacity duration-500',
            intro && 'pointer-events-none opacity-0',
            controlsClassName,
          )}
        >
          <div className="glass flex flex-col overflow-hidden rounded-2xl shadow-lift">
            <button type="button" className={iconButton} onClick={() => map.current?.zoomIn()} aria-label="Zoom in">
              <Plus className="h-4 w-4" />
            </button>
            <div className="h-px bg-white/10" />
            <button type="button" className={iconButton} onClick={() => map.current?.zoomOut()} aria-label="Zoom out">
              <Minus className="h-4 w-4" />
            </button>
            <div className="h-px bg-white/10" />
            <button
              type="button"
              className={iconButton}
              onClick={() =>
                map.current?.easeTo({
                  pitch: map.current.getPitch() > 10 ? 0 : EXPLORE_CAMERA.pitch,
                  bearing: map.current.getPitch() > 10 ? 0 : EXPLORE_CAMERA.bearing,
                  duration: 900,
                })
              }
              aria-label="Toggle 3D view"
              title="Toggle 3D view"
            >
              <Compass className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            className={cn(iconButton, 'glass rounded-2xl shadow-lift')}
            onClick={handleLocateMe}
            disabled={isLocating}
            aria-label="Use my location as home"
            title="Use my location as home"
          >
            {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          </button>
        </div>
      </div>
    );
  },
);

JobMap.displayName = 'JobMap';

export default JobMap;
