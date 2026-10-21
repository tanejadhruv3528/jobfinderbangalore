import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
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

/** Pick a commute mode and drag the time limit; the radius on the map follows live */
const CommuteCard = ({ filters, onChange, reachableCount, className }: CommuteCardProps) => {
  const minutes = filters.maxMinutes;
  const km = minutes > 0 ? reachKm(minutes, filters.mode) : 0;

  return (
    <div className={cn('rounded-2xl border border-white/10 bg-white/[0.04] p-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Home className="h-3.5 w-3.5" />
          </span>
          Your commute
        </p>
        <div className="relative flex rounded-full bg-white/[0.06] p-0.5" role="radiogroup" aria-label="Commute mode">
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
                'relative flex h-8 w-10 items-center justify-center rounded-full transition-colors',
                filters.mode === mode ? 'text-ink-foreground' : 'text-foreground/60 hover:text-foreground',
              )}
            >
              {filters.mode === mode && (
                <motion.span
                  layoutId="commute-mode"
                  className="absolute inset-0 rounded-full bg-ink"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <CommuteIcon mode={mode} className="relative h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <p className="font-display text-2xl font-bold leading-none">
          {minutes > 0 ? (
            <>
              {minutes}
              <span className="ml-1 text-base font-semibold text-foreground/60">min max</span>
            </>
          ) : (
            <span className="text-foreground/80">Any distance</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {minutes > 0 ? `${km.toFixed(1)} km radius · ${reachableCount} in reach` : 'Drag to set a limit'}
        </p>
      </div>

      <Slider
        className="mt-4"
        value={[minutes]}
        min={0}
        max={MAX_MINUTES}
        step={5}
        onValueChange={([value]) => onChange({ ...filters, maxMinutes: value })}
        aria-label="Maximum commute in minutes"
      />
      <p className="mt-3 text-xs text-muted-foreground">Drag the home pin on the map to move it.</p>
    </div>
  );
};

export default CommuteCard;
