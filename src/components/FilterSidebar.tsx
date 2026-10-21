import { Search, MapPin, Briefcase, Filter, X } from 'lucide-react';
import { JOB_TYPES, JOB_TYPE_LABELS } from '@/lib/jobTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterState } from '@/types';

interface FilterSidebarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  isOpen: boolean;
  onClose: () => void;
}

const jobTypes = ['All Types', ...JOB_TYPES];

const FilterSidebar = ({ filters, onFiltersChange, isOpen, onClose }: FilterSidebarProps) => {
  const handleFilterChange = (key: keyof FilterState, value: string | number) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      distance: 50,
      jobType: 'All Types',
      searchQuery: '',
    });
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-80 bg-card border-r border-border
          transform transition-transform duration-300 ease-in-out
          lg:transform-none lg:block
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          pt-20 lg:pt-4
        `}
      >
        <div className="p-5 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-semibold flex items-center gap-2.5">
              <Filter className="w-5 h-5 text-primary" />
              Filters
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="space-y-8">
            {/* Search */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Job title or keyword..."
                  value={filters.searchQuery}
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Distance */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Distance
                </Label>
                <span className="text-sm font-medium text-muted-foreground">{filters.distance} km</span>
              </div>
              <Slider
                value={[filters.distance]}
                onValueChange={(value) => handleFilterChange('distance', value[0])}
                max={100}
                min={5}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5 km</span>
                <span>100 km</span>
              </div>
            </div>

            {/* Job Type */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                Job Type
              </Label>
              <Select
                value={filters.jobType}
                onValueChange={(value) => handleFilterChange('jobType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {jobTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === 'All Types' ? type : JOB_TYPE_LABELS[type as keyof typeof JOB_TYPE_LABELS]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default FilterSidebar;
