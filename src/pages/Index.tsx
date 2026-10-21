import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import FilterSidebar from '@/components/FilterSidebar';
import JobMap from '@/components/JobMap';
import JobList from '@/components/JobList';
import { FilterState, Job } from '@/types';
import { fetchJobs } from '@/services/jobService';
import { useQuery } from '@tanstack/react-query';
import { BANGALORE_CENTER, calculateDistance, nearBangaloreOrCenter } from '@/lib/distance';

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    distance: 50,
    jobType: 'All Types',
    searchQuery: '',
  });

  // Fetch jobs from API
  const { data: apiJobs, isLoading, error, refetch } = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
  });

  // Show "Updating results..." briefly when filters change
  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    setIsUpdating(true);
    
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      setIsUpdating(false);
    }, 400);
  }, []);

  // Use API jobs
  const allJobs = useMemo(() => {
    return apiJobs || [];
  }, [apiJobs]);

  // Filter jobs based on current filters
  const filteredJobs = useMemo(() => {
    return allJobs.filter(job => {
      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesSearch = 
          job.title.toLowerCase().includes(query) ||
          job.company?.name.toLowerCase().includes(query) ||
          job.description.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Job type filter
      if (filters.jobType !== 'All Types' && job.jobType !== filters.jobType) {
        return false;
      }

      // Distance filter, measured from the visitor (or the city centre)
      if (userLocation && job.location) {
        const km = calculateDistance(userLocation.lat, userLocation.lng, job.location.latitude, job.location.longitude);
        if (km > filters.distance) return false;
      }

      return true;
    });
  }, [allJobs, filters, userLocation]);

  // Auto-detect user location on mount
  useEffect(() => {
    // Start from the city centre; switch to the visitor's position if they are in Bangalore
    setUserLocation(BANGALORE_CENTER);
    navigator.geolocation?.getCurrentPosition((position) => {
      setUserLocation(nearBangaloreOrCenter({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }));
    });
  }, []);

  // Handle job card click - select its location
  const handleJobSelect = useCallback((job: Job) => {
    setSelectedLocationId(job.locationId);
  }, []);

  // Handle location select from map
  const handleLocationSelect = useCallback((locationId: string | null) => {
    setSelectedLocationId(locationId);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16 h-screen flex flex-col">
        {/* Hero Section */}
        <div className="border-b border-border px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-baseline gap-x-3">
          <h1 className="text-lg md:text-xl font-bold text-foreground leading-tight">
            Jobs near you in Bangalore
          </h1>
          <p className="text-sm text-muted-foreground">
            Tap a pin to see the job, then apply directly with the employer.
          </p>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Mobile filter toggle */}
          <Button
            variant="filter"
            size="icon"
            className="fixed bottom-4 left-4 z-30 lg:hidden shadow-lg"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          {/* Filter Sidebar */}
          <FilterSidebar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Main content area */}
          <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            {/* Map */}
            <div className="h-[45vh] flex-none lg:h-auto lg:flex-1 relative">
              <JobMap
                jobs={filteredJobs}
                selectedLocationId={selectedLocationId}
                onLocationSelect={handleLocationSelect}
                userLocation={userLocation}
              />
              {/* Subtle updating feedback */}
              {isUpdating && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="text-xs text-muted-foreground bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border shadow-sm">
                    Updating results…
                  </span>
                </div>
              )}
            </div>

            {/* Job list */}
            <div className="w-full lg:w-96 flex-1 min-h-0 lg:flex-none lg:h-auto bg-card border-t lg:border-t-0 lg:border-l border-border overflow-hidden">
              <JobList
                jobs={filteredJobs}
                selectedLocationId={selectedLocationId}
                onJobSelect={handleJobSelect}
                isLoading={isLoading}
                error={error}
                onRetry={() => refetch()}
                userLocation={userLocation}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;