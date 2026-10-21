import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const PinMark = ({ className, inverted = false }: { className?: string; inverted?: boolean }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <rect width="32" height="32" rx="9" fill={inverted ? 'hsl(var(--ink-foreground) / 0.1)' : 'hsl(var(--ink))'} />
    <path
      d="M16 5.5c-4.7 0-8.5 3.7-8.5 8.4 0 6 7.2 12.3 7.9 12.9a.9.9 0 0 0 1.2 0c.7-.6 7.9-6.9 7.9-12.9 0-4.7-3.8-8.4-8.5-8.4Z"
      fill="hsl(var(--primary))"
    />
    <circle cx="16" cy="13.8" r="3.2" fill="#fff" />
  </svg>
);

const Logo = ({ className, inverted = false }: { className?: string; inverted?: boolean }) => (
  <Link to="/" className={cn('flex items-center gap-2.5 group', className)} aria-label="JobPins home">
    <PinMark inverted={inverted} className="h-9 w-9 transition-transform duration-200 group-hover:-rotate-6" />
    <span
      className={cn(
        'font-display text-[22px] font-bold tracking-tight leading-none',
        inverted ? 'text-ink-foreground' : 'text-foreground',
      )}
    >
      jobpins
    </span>
  </Link>
);

export default Logo;
