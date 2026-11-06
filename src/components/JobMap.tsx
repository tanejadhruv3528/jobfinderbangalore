import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Compass, Loader2, LocateFixed, MapPinOff, Minus, Plus, Star, X } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Job } from '@/types';
import { initials } from '@/lib/format';
import { BANGALORE_CENTER } from '@/lib/distance';
import { circlePolygon } from '@/lib/commute';
import { cn } from '@/lib/utils';
import { useIsDesktop } from '@/hooks/use-mobile';

// Mapbox public access token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoidGFuZWphLWRocnV2IiwiYSI6ImNtdmpjZm14czBjaWEyeXNieXoyNHJ2b2sifQ.8NGZ41t_T45oLpYR4ee0Hg';

const PIN_SVG = `<svg viewBox="0 0 34 42"><path class="jp-pin-body" d="M17 1.5C8.4 1.5 1.5 8.3 1.5 16.8c0 10.6 13.2 22 14.4 23a1.7 1.7 0 0 0 2.2 0c1.2-1 14.4-12.4 14.4-23C32.5 8.3 25.6 1.5 17 1.5Z"/></svg>`;
const HOME_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/></svg>`;

const STACK_ICON = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 4.5-9 4.5-9-4.5z"/><path d="m3 12 9 4.5 9-4.5"/><path d="m3 16.5 9 4.5 9-4.5"/></svg>`;

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

/** Jobs that share one spot on the map, drawn as a single pin */
interface PinGroup {
  key: string;
  lat: number;
  lng: number;
  jobs: Job[];
  pin: HTMLDivElement;
  label: HTMLSpanElement;
  tag: HTMLSpanElement;
  badge: HTMLSpanElement;
}

/** Spots closer than about 10 m overlap at every zoom level, so they share a pin */
const spotKey = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

const companyName = (job: Job) => job.company?.name || job.title;

/** Initials when every role is at one company, otherwise null */
function sharedInitials(jobs: Job[]): string | null {
  const names = new Set(jobs.map((job) => companyName(job).trim().toLowerCase()));
  return names.size === 1 ? initials(companyName(jobs[0])) : null;
}

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
  'flex h-10 w-10 items-center justify-center text-foreground/85 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-60';

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
    const groups = useRef<PinGroup[]>([]);
    const stackPopup = useRef<mapboxgl.Popup | null>(null);
    // On computers the list floats above the pin; on phones it is a panel along the bottom
    const [stack, setStack] = useState<{ key: string; jobs: Job[]; node: HTMLDivElement | null } | null>(null);
    const isDesktop = useIsDesktop();
    const homeMarker = useRef<mapboxgl.Marker | null>(null);
    const callbacks = useRef({ onJobSelect, onJobHover, onHomeChange });
    const paddingRef = useRef(padding);
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    const matchRef = useRef(matchIds);
    const [renderTick, setRenderTick] = useState(0);

    callbacks.current = { onJobSelect, onJobHover, onHomeChange };
    paddingRef.current = padding;
    matchRef.current = matchIds;

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

      // A style that never arrives (bad token, offline, blocked) would otherwise leave a blank panel.
      // Tile errors after the style has loaded are left to Mapbox's own retries.
      m.on('error', (e) => {
        console.error('Map error:', e.error);
        if (!m.isStyleLoaded()) setFailed(true);
      });

      m.on('click', (e) => {
        const target = e.originalEvent.target as HTMLElement;
        if (target.closest('.jp-stack-popup')) return;
        if (!target.closest('.jp-pin')) {
          setStack(null);
          callbacks.current.onJobSelect(null);
        }
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
      // Re-rendering the 3D city every frame ties up a phone's main thread for seconds,
      // so the orbit only runs on computers with a mouse
      if (window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches) return;

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

    // Build one pin per spot, once per job set, with a staggered drop-in.
    // Many roles can share an office, and separate pins there pile up into one dark smudge.
    useEffect(() => {
      const m = map.current;
      if (!m || !loaded) return;
      const created: mapboxgl.Marker[] = [];
      const bySpot = new Map<string, Job[]>();

      jobs.forEach((job) => {
        const lat = job.location?.latitude;
        const lng = job.location?.longitude;
        if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return;
        const key = spotKey(lat, lng);
        const list = bySpot.get(key);
        if (list) list.push(job);
        else bySpot.set(key, [job]);
      });

      groups.current = [...bySpot.entries()].map(([key, spotJobs], i) => {
        const { latitude: lat, longitude: lng } = spotJobs[0].location!;
        const wrapper = document.createElement('div');
        const pin = document.createElement('div');
        pin.className = 'jp-pin';
        pin.setAttribute('role', 'button');

        const inner = document.createElement('div');
        inner.className = 'jp-pin-inner';
        inner.style.setProperty('--drop-delay', `${400 + Math.min(i, 30) * 70}ms`);
        inner.innerHTML = PIN_SVG;

        const label = document.createElement('span');
        label.className = 'jp-pin-label';
        inner.appendChild(label);

        const badge = document.createElement('span');
        badge.className = 'jp-pin-count';
        badge.setAttribute('aria-hidden', 'true');
        inner.appendChild(badge);

        const tag = document.createElement('span');
        tag.className = 'jp-pin-tag';
        inner.appendChild(tag);

        pin.appendChild(inner);
        wrapper.appendChild(pin);

        const group: PinGroup = { key, lat, lng, jobs: spotJobs, pin, label, tag, badge };
        const shown = () => spotJobs.filter((job) => matchRef.current.has(job.id));

        pin.addEventListener('click', (e) => {
          e.stopPropagation();
          const visible = shown();
          if (visible.length === 1) {
            setStack(null);
            callbacks.current.onJobSelect(visible[0].id);
          } else if (visible.length > 1) {
            openStack(group, visible);
          }
        });
        pin.addEventListener('mouseenter', () => {
          const visible = shown();
          if (visible.length === 1) callbacks.current.onJobHover(visible[0].id);
          else pin.classList.add('is-stack-hover');
        });
        pin.addEventListener('mouseleave', () => {
          pin.classList.remove('is-stack-hover');
          callbacks.current.onJobHover(null);
        });

        created.push(new mapboxgl.Marker({ element: wrapper, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(m));
        return group;
      });
      setRenderTick((t) => t + 1);

      return () => {
        created.forEach((marker) => marker.remove());
        groups.current = [];
      };
    }, [jobs, loaded]);

    // Reflect filters, reach, hover and selection on the pins
    useEffect(() => {
      groups.current.forEach(({ jobs: spotJobs, pin, label, tag, badge }) => {
        const visible = spotJobs.filter((job) => matchIds.has(job.id));
        const count = visible.length;
        pin.style.display = count ? '' : 'none';
        if (!count) return;

        const selected = visible.find((job) => job.id === selectedJobId);
        const hovered = visible.find((job) => job.id === hoveredJobId);
        // Every job in a spot shares its coordinates, so they are all in or out of reach together
        const far = !!reachIds && !reachIds.has(visible[0].id) && !selected;
        const shared = sharedInitials(visible);
        const company = shared ? companyName(visible[0]) : null;

        pin.classList.toggle('is-stack', count > 1);
        pin.classList.toggle('is-mixed', !shared);
        pin.classList.toggle('is-featured', visible.some((job) => job.isFeatured));
        pin.classList.toggle('is-far', far);
        pin.classList.toggle('is-hover', !!hovered && !selected);
        pin.classList.toggle('is-selected', !!selected);

        if (shared) label.textContent = shared;
        else label.innerHTML = STACK_ICON;
        badge.textContent = count > 99 ? '99+' : String(count);

        const focus = selected ?? hovered;
        tag.textContent = focus
          ? count > 1 ? `${focus.title} · +${count - 1} more` : focus.title
          : count > 1 ? `${count} roles${company ? ` at ${company}` : ' here'}` : visible[0].title;

        pin.setAttribute(
          'aria-label',
          count > 1
            ? `${count} jobs${company ? ` at ${company}` : ''} at this spot. Show the list`
            : `${visible[0].title} at ${visible[0].company?.name ?? 'company'}`,
        );
        (pin.parentElement as HTMLElement).style.zIndex = selected ? '20' : hovered ? '10' : count > 1 ? '2' : '';
      });

      // Keep an open stack list in step with the filters
      setStack((current) => {
        if (!current) return current;
        const group = groups.current.find((g) => g.key === current.key);
        const visible = group?.jobs.filter((job) => matchIds.has(job.id)) ?? [];
        if (visible.length < 2) return null;
        return visible.length === current.jobs.length && visible.every((job, i) => job === current.jobs[i]) ? current : { ...current, jobs: visible };
      });
    }, [matchIds, reachIds, hoveredJobId, selectedJobId, renderTick, loaded]);

    // The list of roles at a stacked spot
    const openStack = (group: PinGroup, visible: Job[]) => {
      const m = map.current;
      if (!m) return;
      stackPopup.current?.remove();
      stackPopup.current = null;
      const { top = 0, bottom = 0, left = 0, right = 0 } = paddingRef.current;

      if (!window.matchMedia('(min-width: 1024px)').matches) {
        // Phones: keep the pin in sight above the bottom panel
        setStack({ key: group.key, jobs: visible, node: null });
        m.easeTo({
          center: [group.lng, group.lat],
          padding: { top: top + 40, bottom: Math.round(window.innerHeight * 0.55), left: 40, right: 40 },
          duration: 700,
          essential: true,
        });
        return;
      }

      const node = document.createElement('div');
      stackPopup.current = new mapboxgl.Popup({
        anchor: 'bottom',
        offset: 50,
        closeButton: false,
        closeOnClick: false,
        maxWidth: 'none',
        className: 'jp-stack-popup',
        focusAfterOpen: false,
      })
        .setLngLat([group.lng, group.lat])
        .setDOMContent(node)
        .addTo(m);
      setStack({ key: group.key, jobs: visible, node });
      // Bring the spot down into view so the list above it has room
      m.easeTo({
        center: [group.lng, group.lat],
        padding: { top: top + 320, bottom: bottom + 40, left: left + 40, right: right + 40 },
        duration: 700,
        essential: true,
      });
    };

    // Switching between the phone and computer layouts closes the list rather than moving it
    useEffect(() => setStack(null), [isDesktop]);

    useEffect(() => {
      if (stack) return;
      stackPopup.current?.remove();
      stackPopup.current = null;
    }, [stack]);

    useEffect(() => {
      if (!stack) return;
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setStack(null);
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [stack]);

    // The intro hides every panel, so a list left open there would float alone
    useEffect(() => {
      if (intro) setStack(null);
    }, [intro]);

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
      <div className="relative h-full w-full overflow-hidden bg-background">
        {/* mapbox-gl.css sets .mapboxgl-map to position: relative, and since the map loads in its own chunk that rule
            now lands after Tailwind's, so absolute has to be forced or the map collapses to zero height */}
        <div ref={container} className="!absolute inset-0" />

        {stack &&
          createPortal(
            <div
              role="dialog"
              aria-label="Roles at this spot"
              className={cn(
                'map-surface overflow-hidden shadow-lift',
                stack.node ? 'w-[320px] rounded-2xl' : 'fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-[55] rounded-3xl',
              )}
            >
              <div className="flex items-center justify-between gap-2 border-b border-border py-2 pl-4 pr-1.5">
                <p className="truncate text-sm font-semibold">
                  {stack.jobs.length} roles
                  {sharedInitials(stack.jobs) ? ` at ${companyName(stack.jobs[0])}` : ' at this spot'}
                </p>
                <button
                  type="button"
                  onClick={() => setStack(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                  aria-label="Close list"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul className={cn('overflow-y-auto overscroll-contain py-1', stack.node ? 'max-h-[260px]' : 'max-h-[42dvh]')}>
                {stack.jobs.map((job) => (
                  <li key={job.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setStack(null);
                        callbacks.current.onJobSelect(job.id);
                      }}
                      onMouseEnter={() => callbacks.current.onJobHover(job.id)}
                      onMouseLeave={() => callbacks.current.onJobHover(null)}
                      className={cn(
                        'flex w-full items-start gap-2 px-4 py-2.5 text-left transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none',
                        job.id === selectedJobId && 'bg-secondary',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{job.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{job.company?.name ?? 'Company'}</span>
                      </span>
                      {job.isFeatured && <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-current text-primary" aria-label="Featured" />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>,
            stack.node ?? document.body,
          )}

        {failed && !loaded && !intro && (
          // Centre the card in the part of the map the panels leave visible
          <div
            role="alert"
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
            style={{
              paddingTop: (padding.top ?? 0) + 24,
              paddingBottom: (padding.bottom ?? 0) + 24,
              paddingLeft: (padding.left ?? 0) + 24,
              paddingRight: (padding.right ?? 0) + 24,
            }}
          >
            <div className="map-surface pointer-events-auto max-w-sm rounded-3xl p-6 text-center shadow-lift">
              <MapPinOff className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-3 font-display text-lg font-bold">The map couldn’t load</p>
              <p className="mt-1 text-sm text-muted-foreground">Check your internet connection, then refresh. You can still browse every job in the list.</p>
              <button type="button" onClick={() => window.location.reload()} className="mt-4 h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                Refresh
              </button>
            </div>
          </div>
        )}

        <div
          className={cn(
            'absolute z-10 flex flex-col gap-2 transition-opacity duration-300',
            intro && 'pointer-events-none opacity-0',
            controlsClassName,
          )}
        >
          <div className="map-surface flex flex-col overflow-hidden rounded-2xl shadow-lift">
            <button type="button" className={iconButton} onClick={() => map.current?.zoomIn()} aria-label="Zoom in">
              <Plus className="h-4 w-4" />
            </button>
            <div className="h-px bg-border" />
            <button type="button" className={iconButton} onClick={() => map.current?.zoomOut()} aria-label="Zoom out">
              <Minus className="h-4 w-4" />
            </button>
            <div className="h-px bg-border" />
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
            className={cn(iconButton, 'map-surface rounded-2xl shadow-lift')}
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
