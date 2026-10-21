/**
 * Rough commute estimates for Bangalore. Straight-line distance is stretched to
 * approximate road distance, then divided by a typical door-to-door speed.
 */
export type CommuteMode = 'walk' | 'bike' | 'car';

const ROAD_FACTOR = 1.35;

/** Typical average speeds in km/h, including Bangalore traffic */
const SPEED_KMH: Record<CommuteMode, number> = {
  walk: 4.5,
  bike: 18,
  car: 14,
};

export const COMMUTE_LABELS: Record<CommuteMode, string> = {
  walk: 'Walk',
  bike: 'Bike',
  car: 'Car',
};

export function commuteMinutes(km: number, mode: CommuteMode): number {
  return Math.max(1, Math.round(((km * ROAD_FACTOR) / SPEED_KMH[mode]) * 60));
}

/** Straight-line radius in km reachable within `minutes` */
export function reachKm(minutes: number, mode: CommuteMode): number {
  return (SPEED_KMH[mode] * minutes) / 60 / ROAD_FACTOR;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Polygon approximating a circle, for drawing the commute radius on the map */
export function circlePolygon(center: { lat: number; lng: number }, radiusKm: number, steps = 96) {
  const coords: [number, number][] = [];
  const latRad = (center.lat * Math.PI) / 180;
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dLat = (radiusKm / 110.574) * Math.sin(angle);
    const dLng = (radiusKm / (111.32 * Math.cos(latRad))) * Math.cos(angle);
    coords.push([center.lng + dLng, center.lat + dLat]);
  }
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'Polygon' as const, coordinates: [coords] },
  };
}
