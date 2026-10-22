import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BANGALORE_CENTER } from '@/lib/distance';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoidGFuZWphLWRocnV2IiwiYSI6ImNtdmpjZm14czBjaWEyeXNieXoyNHJ2b2sifQ.8NGZ41t_T45oLpYR4ee0Hg';

type Point = { latitude: number; longitude: number };

/** Full-screen map for dropping the job's pin by hand: tap anywhere or drag the pin. */
const LocationPicker = ({ initial, onPick, onClose }: { initial: Point | null; onPick: (p: Point) => void; onClose: () => void }) => {
  const container = useRef<HTMLDivElement>(null);
  const [point, setPoint] = useState<Point>(initial ?? { latitude: BANGALORE_CENTER.lat, longitude: BANGALORE_CENTER.lng });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const start: [number, number] = [point.longitude, point.latitude];
    const map = new mapboxgl.Map({
      container: container.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: start,
      zoom: initial ? 16 : 11,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('error', () => {
      if (!map.isStyleLoaded()) setFailed(true);
    });

    const marker = new mapboxgl.Marker({ color: '#f5603a', draggable: true }).setLngLat(start).addTo(map);
    const move = (lng: number, lat: number) => setPoint({ latitude: lat, longitude: lng });
    marker.on('dragend', () => {
      const { lng, lat } = marker.getLngLat();
      move(lng, lat);
    });
    map.on('click', (e) => {
      marker.setLngLat(e.lngLat);
      move(e.lngLat.lng, e.lngLat.lat);
    });

    return () => map.remove();
    // The map is created once; later picks only move the marker
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-modal="true" aria-label="Pick the job location">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-tight">Drop the pin on your workplace</p>
          <p className="truncate text-sm text-muted-foreground">Tap the map or drag the pin. Zoom in for accuracy.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-secondary">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex-1">
        <div ref={container} className="!absolute inset-0" />
        {failed && (
          <div role="alert" className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
            The map couldn't load. Check your connection, or paste a Google Maps link instead.
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <span className="text-sm tabular-nums text-muted-foreground">
          {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
        </span>
        <Button onClick={() => onPick(point)}>
          <Check />
          Use this spot
        </Button>
      </div>
    </div>
  );
};

export default LocationPicker;
