import { useState, useMemo, useEffect, useCallback } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import FilterSidebar from '@/components/FilterSidebar';
import JobMap from '@/components/JobMap';
import JobList from '@/components/JobList';
import { FilterState, Job } from '@/types';
import { fetchJobsFromApi } from '@/services/apiJobService';
import { useQuery } from '@tanstack/react-query';

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    distance: 50,
    role: 'All Roles',
    jobType: 'All Types',
    searchQuery: '',
  });

  // Fetch jobs from API
  const { data: apiJobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobsFromApi,
  });

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

      // Role filter
      if (filters.role !== 'All Roles' && job.role !== filters.role) {
        return false;
      }

      // Job type filter
      if (filters.jobType !== 'All Types' && job.jobType !== filters.jobType) {
        return false;
      }

      return true;
    });
  }, [allJobs, filters]);

  // Auto-detect user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Default to Bangalore if geolocation fails
          setUserLocation({ lat: 12.9716, lng: 77.5946 });
        }
      );
    }
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
        <div className="bg-primary/5 border-b border-border px-6 py-5 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
            Discover Jobs Near You
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-xl mx-auto">
            Browse the map to find opportunities, or filter by role and type to narrow your search.
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
            onFiltersChange={setFilters}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Main content area */}
          <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            {/* Map */}
            <div className="flex-1 h-[50vh] lg:h-auto">
              <JobMap
                jobs={filteredJobs}
                selectedLocationId={selectedLocationId}
                onLocationSelect={handleLocationSelect}
                userLocation={userLocation}
              />
            </div>

            {/* Job list */}
            <div className="w-full lg:w-96 h-[50vh] lg:h-auto bg-card border-l border-border overflow-hidden">
              <JobList
                jobs={filteredJobs}
                selectedLocationId={selectedLocationId}
                onJobSelect={handleJobSelect}
                isLoading={isLoading}
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