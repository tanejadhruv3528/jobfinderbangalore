import { useState, useEffect, useMemo } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import FilterSidebar from '@/components/FilterSidebar';
import JobMap from '@/components/JobMap';
import JobList from '@/components/JobList';
import { FilterState, Job } from '@/types';
import { getJobsWithDetails } from '@/data/mockData';

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    distance: 50,
    role: 'All Roles',
    jobType: 'All Types',
    searchQuery: '',
  });

  // Get jobs with company and location data
  const allJobs = useMemo(() => getJobsWithDetails(), []);

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
          // Default to San Francisco if geolocation fails
          setUserLocation({ lat: 37.7749, lng: -122.4194 });
        }
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16 h-screen flex flex-col lg:flex-row">
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
              selectedJob={selectedJob}
              onJobSelect={setSelectedJob}
              userLocation={userLocation}
            />
          </div>

          {/* Job list */}
          <div className="w-full lg:w-96 h-[50vh] lg:h-auto bg-card border-l border-border overflow-hidden">
            <JobList
              jobs={filteredJobs}
              selectedJob={selectedJob}
              onJobSelect={setSelectedJob}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
