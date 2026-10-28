import { Search, X } from 'lucide-react';
import { FilterState } from '@/types';
import { JOB_TYPES, JOB_TYPE_LABELS } from '@/lib/jobTypes';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  className?: string;
}

export const DEFAULT_FILTERS: FilterState = {
  mode: 'bike',
  maxMinutes: 0,
  jobType: 'all',
  searchQuery: '',
  sort: 'nearest',
};

const chip = (active: boolean) =>
  cn(
    'h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    active ? 'bg-ink text-ink-foreground' : 'map-surface text-foreground/80 hover:border-foreground/40 hover:text-foreground active:bg-secondary',
  );

/** Search box and job-type chips that float over the map */
const FilterBar = ({ filters, onChange, className }: FilterBarProps) => {
  // The full hint gets cut to a few letters next to the logo and Post button on phones
  const compact = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) => onChange({ ...filters, [key]: value });

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <label className="map-surface relative block rounded-full focus-within:border-ring">
        <span className="sr-only">Search jobs</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-foreground/60" />
        <input
          type="search"
          value={filters.searchQuery}
          onChange={(e) => set('searchQuery', e.target.value)}
          placeholder={compact ? "Search" : "Search role, company, skill or area"}
          className={cn('h-11 w-full rounded-full bg-transparent pl-11 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-search-cancel-button]:hidden', filters.searchQuery ? 'pr-11' : 'pr-4')}
        />
        {filters.searchQuery && (
          <button
            type="button"
            onClick={() => set('searchQuery', '')}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-foreground/60 transition-colors duration-150 hover:bg-secondary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </label>

      <div className="scrollbar-none -mx-4 flex items-center gap-2 overflow-x-auto px-4 py-1">
        <button type="button" className={chip(filters.jobType === 'all')} onClick={() => set('jobType', 'all')} aria-pressed={filters.jobType === 'all'}>
          All jobs
        </button>
        {JOB_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={chip(filters.jobType === type)}
            onClick={() => set('jobType', filters.jobType === type ? 'all' : type)}
            aria-pressed={filters.jobType === type}
          >
            {JOB_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FilterBar;
