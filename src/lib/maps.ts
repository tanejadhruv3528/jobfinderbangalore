/**
 * Extract latitude and longitude from a Google Maps URL.
 * Supports ".../@lat,lng,...", "...!3dlat!4dlng..." and "?q=lat,lng" forms.
 * Short links (maps.app.goo.gl) carry no coordinates and return null.
 */
export function extractLatLngFromGoogleMaps(url: string): { latitude: number; longitude: number } | null {
  const patterns = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const latitude = parseFloat(match[1]);
      const longitude = parseFloat(match[2]);
      if (Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
        return { latitude, longitude };
      }
    }
  }

  return null;
}
