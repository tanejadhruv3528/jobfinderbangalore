// Fallback pin for a crawled job whose listing names no area: look the company's
// Bangalore office up on OpenStreetMap (Nominatim). Its usage policy allows about
// one request a second with an identifying User-Agent, so callers go one at a time.

const BANGALORE_VIEWBOX = '77.40,13.20,77.85,12.75'; // left,top,right,bottom

export const geocodeCompany = async (
  company: string,
): Promise<{ latitude: number; longitude: number } | null> => {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({
    q: `${company}, Bengaluru`,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'in',
    viewbox: BANGALORE_VIEWBOX,
    bounded: '1',
  }).toString();
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'JobPins crawler (https://www.jobpins.in)' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const [hit] = (await res.json()) as { lat: string; lon: string }[];
    return hit ? { latitude: Number(hit.lat), longitude: Number(hit.lon) } : null;
  } catch {
    return null;
  } finally {
    await new Promise((r) => setTimeout(r, 1100));
  }
};
