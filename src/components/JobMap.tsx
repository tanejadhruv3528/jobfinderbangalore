import { useEffect, useRef, useState } from 'react';
import { Navigation, Loader2 } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Location, Job } from '@/types';
import { supabase } from '@/integrations/supabase/client';

// Mapbox public access token
const MAPBOX_TOKEN = 'pk.eyJ1IjoidGFuZWphLWRocnV2IiwiYSI6ImNtazFrYmw0NzA1OWUzZHF3NWczYnN0NHcifQ.-ZdRZgv8qdygmFOjPQwY2w';

// Default center: Bangalore, India
const DEFAULT_CENTER: [number, number] = [77.5946, 12.9716]; // [lng, lat]
const DEFAULT_ZOOM = 11;

interface JobMapProps {
  jobs: Job[];
  selectedLocationId: string | null;
  onLocationSelect: (locationId: string | null) => void;
  userLocation: { lat: number; lng: number } | null;
}

const JobMap = ({ jobs, selectedLocationId, onLocationSelect, userLocation }: JobMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: mapboxgl.Marker; element: HTMLDivElement }>>(new Map());
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
    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current.clear();

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
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      `;

      el.addEventListener('click', () => {
        onLocationSelect(location.id);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map.current!);

      markersRef.current.set(location.id, { marker, element: el });
    });
  }, [locations, mapLoaded, onLocationSelect]);

  // Handle marker highlight when selectedLocationId changes
  useEffect(() => {
    markersRef.current.forEach(({ element }, locationId) => {
      if (locationId === selectedLocationId) {
        element.style.transform = 'scale(1.3)';
        element.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
        element.style.zIndex = '10';
      } else {
        element.style.transform = 'scale(1)';
        element.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        element.style.zIndex = '1';
      }
    });

    // Center map on selected location
    if (selectedLocationId && map.current) {
      const location = locations.find(loc => loc.id === selectedLocationId);
      if (location) {
        map.current.flyTo({
          center: [location.longitude, location.latitude],
          zoom: 13,
          duration: 500,
        });
      }
    }
  }, [selectedLocationId, locations]);

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