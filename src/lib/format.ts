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

const AVATAR_COLORS = [
  ['#FDE7DF', '#B53A1B'],
  ['#E3ECFB', '#2A4FA0'],
  ['#EDE6FA', '#5B3BA8'],
  ['#E0F2EA', '#1F6B4A'],
  ['#FCF0D6', '#8A5A06'],
  ['#F9E1EC', '#A1295E'],
  ['#DFF1F4', '#1D6673'],
  ['#ECE9E4', '#3D3A35'],
];

/** Stable background/foreground pair for a company name. */
export function avatarColors(name: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const [bg, fg] = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return { bg, fg };
}

export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
