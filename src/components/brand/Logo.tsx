import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/*
 * Official Jobpins logo set (see public/brand). The site is dark, so it uses the
 * "on-dark" variants: the full logo (pin + wordmark), or the pin alone when compact.
 */
const Logo = ({ className, compact = false }: { className?: string; compact?: boolean }) => (
  <Link
    to="/"
    className={cn(
      'group flex items-center rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring',
      className,
    )}
    aria-label="Jobpins home"
  >
    {compact ? (
      <img
        src="/brand/jobpins-mark-on-dark.svg"
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 transition-transform duration-200 group-hover:-rotate-12"
      />
    ) : (
      <img
        src="/brand/jobpins-logo-on-dark.svg"
        alt=""
        width={144}
        height={36}
        className="h-9 w-auto transition-transform duration-200 group-hover:-translate-y-0.5"
      />
    )}
  </Link>
);

export default Logo;
