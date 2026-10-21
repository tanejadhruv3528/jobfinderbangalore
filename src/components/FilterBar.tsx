import { Search, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterState, SortOrder } from '@/types';
import { JOB_TYPES, JOB_TYPE_LABELS } from '@/lib/jobTypes';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export const DEFAULT_FILTERS: FilterState = {
  distance: 0,
  jobType: 'all',
  searchQuery: '',
  sort: 'nearest',
};

const DISTANCES = [
  { value: 0, label: 'Anywhere' },
  { value: 2, label: 'Within 2 km' },
  { value: 5, label: 'Within 5 km' },
  { value: 10, label: 'Within 10 km' },
  { value: 20, label: 'Within 20 km' },
];

const chip = (active: boolean) =>
  cn(
    'h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors',
    active
      ? 'border-ink bg-ink text-ink-foreground'
      : 'border-border bg-card text-foreground/80 hover:border-foreground/30 hover:text-foreground',
  );

const selectTrigger =
  'h-9 w-auto shrink-0 gap-1.5 rounded-full px-3.5 font-medium focus:ring-2 [&>span]:line-clamp-none';

const FilterBar = ({ filters, onChange }: FilterBarProps) => {
  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) => onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <label className="relative block lg:w-[360px] xl:w-[420px]">
        <span className="sr-only">Search jobs</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={filters.searchQuery}
          onChange={(e) => set('searchQuery', e.target.value)}
          placeholder="Search role, company or skill"
          className="h-12 w-full rounded-full border border-input bg-card pl-11 pr-11 text-[15px] shadow-sm transition-colors placeholder:text-muted-foreground hover:border-foreground/25 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {filters.searchQuery && (
          <button
            type="button"
            onClick={() => set('searchQuery', '')}
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </label>

      <div className="scrollbar-none -mx-4 flex items-center gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
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

        <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden="true" />

        <Select value={String(filters.distance)} onValueChange={(v) => set('distance', Number(v))}>
          <SelectTrigger className={cn(selectTrigger, filters.distance > 0 && 'border-ink')} aria-label="Distance">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DISTANCES.map((d) => (
              <SelectItem key={d.value} value={String(d.value)}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.sort} onValueChange={(v) => set('sort', v as SortOrder)}>
          <SelectTrigger className={selectTrigger} aria-label="Sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nearest">Nearest first</SelectItem>
            <SelectItem value="newest">Newest first</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default FilterBar;
