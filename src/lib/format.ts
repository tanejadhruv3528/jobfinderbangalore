import { formatDistanceToNowStrict } from 'date-fns';

/** "Today", "2d ago", "3w ago" for a posted date. */
export function postedAgo(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const hours = (Date.now() - date.getTime()) / 36e5;
  if (hours < 24) return 'Today';
  if (hours < 48) return 'Yesterday';
  return formatDistanceToNowStrict(date, { roundingMethod: 'floor' })
    .replace(/ days?/, 'd')
    .replace(/ weeks?/, 'w')
    .replace(/ months?/, 'mo')
    .replace(/ years?/, 'y') + ' ago';
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Up to two initials from a company name, ignoring suffixes like "Pvt Ltd". */
export function initials(name: string): string {
  const words = name
    .replace(/\b(pvt|private|ltd|limited|llp|inc|technologies|solutions)\b\.?/gi, '')
    .split(/[\s\-–&]+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  return (words[0][0] + (words[1]?.[0] ?? '')).toUpperCase();
}

// Pairs live as --avatar-N-bg / --avatar-N-fg tokens in index.css
const AVATAR_COUNT = 8;

/** Stable background/foreground pair for a company name. */
export function avatarColors(name: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const n = (hash % AVATAR_COUNT) + 1;
  return { bg: `hsl(var(--avatar-${n}-bg))`, fg: `hsl(var(--avatar-${n}-fg))` };
}

export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
