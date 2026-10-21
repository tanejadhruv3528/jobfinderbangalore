// Finds a company's Bangalore office on Google Maps through the same SERP API as
// the job search. Each lookup costs one search, so results are cached per company
// in public.company_locations by the caller.

const BANGALORE = { south: 12.75, north: 13.2, west: 77.4, east: 77.85 };

interface Coords {
  latitude?: number;
  longitude?: number;
}

const inBangalore = (c?: Coords): c is Required<Coords> =>
  !!c && typeof c.latitude === 'number' && typeof c.longitude === 'number' &&
  c.latitude >= BANGALORE.south && c.latitude <= BANGALORE.north &&
  c.longitude >= BANGALORE.west && c.longitude <= BANGALORE.east;

export const companyKey = (company: string): string =>
  company.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);

export const findOfficeOnMaps = async (
  company: string,
): Promise<{ latitude: number; longitude: number } | null> => {
  const provider = Deno.env.get('JOBS_PROVIDER') ?? 'serpapi';
  const apiKey = Deno.env.get('JOBS_API_KEY');
  if (!apiKey) throw new Error('JOBS_API_KEY is not set');

  const url = new URL(provider === 'searchapi' ? 'https://www.searchapi.io/api/v1/search' : 'https://serpapi.com/search.json');
  url.search = new URLSearchParams({
    engine: 'google_maps',
    q: `${company} office Bengaluru`,
    ll: '@12.9716,77.5946,11z',
    type: 'search',
    hl: 'en',
    api_key: apiKey,
  }).toString();

  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Maps API ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);

  const place = (body.place_results as { gps_coordinates?: Coords } | undefined)?.gps_coordinates;
  const local = ((body.local_results as { gps_coordinates?: Coords }[] | undefined) ?? [])
    .map((r) => r.gps_coordinates)
    .find(inBangalore);
  const hit = inBangalore(place) ? place : local;
  return hit ? { latitude: hit.latitude, longitude: hit.longitude } : null;
};
