import { useEffect, useRef, useState } from 'react';
import { Navigation, Loader2 } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Location } from '@/types';
import { supabase } from '@/integrations/supabase/client';

// Mapbox public access token
const MAPBOX_TOKEN = 'pk.eyJ1IjoidGFuZWphLWRocnV2IiwiYSI6ImNtazFrYmw0NzA1OWUzZHF3NWczYnN0NHcifQ.-ZdRZgv8qdygmFOjPQwY2w';

// Default center: Bangalore, India
const DEFAULT_CENTER: [number, number] = [77.5946, 12.9716]; // [lng, lat]
const DEFAULT_ZOOM = 11;

interface JobMapProps {
  userLocation: { lat: number; lng: number } | null;
}

const JobMap = ({ userLocation }: JobMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);

  // Fetch locations from database
  useEffect(() => {
    const fetchLocations = async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('city', 'Bangalore');

      if (error) {
        console.error('Error fetching locations:', error);
        return;
      }

      if (data) {
        setLocations(data.map(loc => ({
          id: loc.id,
          companyId: loc.company_id,
          address: loc.address,
          city: loc.city,
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
        })));
      }
    };

    fetchLocations();
  }, []);

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

  // Update markers when locations change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for each unique location
    locations.forEach((location) => {
      const lat = location.latitude;
      const lng = location.longitude;
      
      if (isNaN(lat) || isNaN(lng)) return;

      const el = document.createElement('div');
      el.className = 'mapbox-marker';
      el.style.cssText = `
        width: 24px;
        height: 24px;
        background: hsl(var(--primary));
        border-radius: 50%;
        border: 3px solid hsl(var(--background));
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
      `;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [locations, mapLoaded]);

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
    </div>
  );
};

export default JobMap;
