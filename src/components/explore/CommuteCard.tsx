import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import CommuteIcon from '@/components/CommuteIcon';
import { COMMUTE_LABELS, CommuteMode, reachKm } from '@/lib/commute';
import { FilterState } from '@/types';
import { cn } from '@/lib/utils';

interface CommuteCardProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  reachableCount: number;
  className?: string;
}

const MODES: CommuteMode[] = ['walk', 'bike', 'car'];
const MAX_MINUTES = 60;
const BY: Record<CommuteMode, string> = { walk: 'on foot', bike: 'by bike', car: 'by car' };

/** The head of the commute board: how far from home, and how. The radius on the map follows live */
const CommuteCard = ({ filters, onChange, reachableCount, className }: CommuteCardProps) => {
  const minutes = filters.maxMinutes;
  const km = minutes > 0 ? reachKm(minutes, filters.mode) : 0;

  return (
    <section aria-labelledby="commute-head" className={cn(className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="commute-head" className="font-sans text-sm font-medium tracking-normal text-muted-foreground">
          Your commute from home
        </h2>
        <div className="relative flex rounded-full bg-secondary p-0.5" role="radiogroup" aria-label="Commute mode">
          {MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={filters.mode === mode}
              aria-label={COMMUTE_LABELS[mode]}
              title={COMMUTE_LABELS[mode]}
              onClick={() => onChange({ ...filters, mode })}
              className={cn(
                'relative flex h-8 w-10 items-center justify-center rounded-full transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                filters.mode === mode ? 'text-ink-foreground' : 'text-foreground/65 hover:text-foreground',
              )}
            >
              {filters.mode === mode && (
                <motion.span
                  layoutId="commute-mode"
                  className="absolute inset-0 rounded-full bg-ink"
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
              <CommuteIcon mode={mode} className="relative h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 font-display text-[34px] font-bold leading-none tracking-tight lg:text-[40px]" aria-live="polite">
        {minutes > 0 ? (
          <>
            <span className="num">{minutes}</span> min
            <span className="ml-2 font-sans text-base font-medium tracking-normal text-muted-foreground">
              {BY[filters.mode]}
            </span>
          </>
        ) : (
          'Any distance'
        )}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {minutes > 0 ? (
          <>
            <span className="num">{km.toFixed(1)}</span> km around home, <span className="num font-semibold text-foreground">{reachableCount}</span>{' '}
            {reachableCount === 1 ? 'job' : 'jobs'} in reach
          </>
        ) : (
          'Drag to set a limit'
        )}
      </p>

      <Slider
        className="mt-5"
        value={[minutes]}
        min={0}
        max={MAX_MINUTES}
        step={5}
        onValueChange={([value]) => onChange({ ...filters, maxMinutes: value })}
        aria-label="Maximum commute in minutes"
      />
      <p className="mt-3 text-xs text-muted-foreground">Drag the home pin on the map to move it.</p>
    </section>
  );
};

export default CommuteCard;
