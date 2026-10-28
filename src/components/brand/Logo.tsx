import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const PinMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="var(--color-accent)" />
    <path
      d="M16 5.5c-4.7 0-8.5 3.7-8.5 8.4 0 6 7.2 12.3 7.9 12.9a.9.9 0 0 0 1.2 0c.7-.6 7.9-6.9 7.9-12.9 0-4.7-3.8-8.4-8.5-8.4Z"
      fill="var(--color-mark)"
    />
    <circle cx="16" cy="13.8" r="3.2" fill="var(--color-accent)" />
  </svg>
);

const Logo = ({ className, compact = false }: { className?: string; compact?: boolean }) => (
  <Link to="/" className={cn('group flex items-center gap-2.5 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring', className)} aria-label="JobPins home">
    <PinMark className="h-9 w-9 transition-transform duration-200 group-hover:-rotate-12" />
    {!compact && (
      <span className="font-display text-[22px] font-bold leading-none tracking-tight text-foreground">jobpins</span>
    )}
  </Link>
);

export default Logo;
