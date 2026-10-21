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
    'h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-all duration-200 active:scale-95',
    active ? 'bg-ink text-ink-foreground shadow-lift' : 'glass text-foreground/80 hover:bg-white/10 hover:text-foreground',
  );

/** Search box and job-type chips that float over the map */
const FilterBar = ({ filters, onChange, className }: FilterBarProps) => {
  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) => onChange({ ...filters, [key]: value });

  return (
    <div className={cn('flex flex-col gap-2.5 xl:flex-row xl:items-center', className)}>
      <label className="glass relative block rounded-full shadow-lift xl:w-[380px]">
        <span className="sr-only">Search jobs</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-foreground/60" />
        <input
          type="search"
          value={filters.searchQuery}
          onChange={(e) => set('searchQuery', e.target.value)}
          placeholder="Search role, company, skill or area"
          className="h-12 w-full rounded-full bg-transparent pl-11 pr-11 text-[15px] text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/60 [&::-webkit-search-cancel-button]:hidden"
        />
        {filters.searchQuery && (
          <button
            type="button"
            onClick={() => set('searchQuery', '')}
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-foreground/60 hover:bg-white/10 hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </label>

      <div className="scrollbar-none -mx-4 flex items-center gap-2 overflow-x-auto px-4 py-1 xl:mx-0 xl:px-0">
        <button type="button" className={chip(filters.jobType === 'all')} onClick={() => set('jobType', 'all')}>
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
