import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { List, Map as MapIcon } from 'lucide-react';
import Header from '@/components/Header';
import FilterBar, { DEFAULT_FILTERS } from '@/components/FilterBar';
import JobMap from '@/components/JobMap';
import JobList from '@/components/JobList';
import JobDetail from '@/components/JobDetail';
import JobCarousel from '@/components/JobCarousel';
import { FilterState, Job } from '@/types';
import { fetchJobs } from '@/services/jobService';
import { BANGALORE_CENTER, calculateDistance, nearBangaloreOrCenter } from '@/lib/distance';
import { useIsDesktop } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// Height of the floating list button plus the card row on phones
const CAROUSEL_HEIGHT = 260;

const Index = () => {
  const isDesktop = useIsDesktop();
  const [searchParams, setSearchParams] = useSearchParams();
  const openJobId = searchParams.get('job');
  const [activeJobId, setActiveJobId] = useState<string | null>(openJobId);
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');
  const [userLocation, setUserLocation] = useState(BANGALORE_CENTER);
  const [usingRealLocation, setUsingRealLocation] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const { data: allJobs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
  });

  // Use the visitor's position when they are in Bangalore, otherwise the city centre
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((position) => {
      const near = nearBangaloreOrCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
      setUserLocation(near);
      setUsingRealLocation(near !== BANGALORE_CENTER);
    });
  }, []);

  const distances = useMemo(() => {
    const map = new Map<string, number>();
    allJobs.forEach((job) => {
      if (job.location) {
        map.set(job.id, calculateDistance(userLocation.lat, userLocation.lng, job.location.latitude, job.location.longitude));
      }
    });
    return map;
  }, [allJobs, userLocation]);

  const jobs = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();
    const filtered = allJobs.filter((job) => {
      if (query) {
        const haystack = `${job.title} ${job.company?.name ?? ''} ${job.location?.address ?? ''} ${job.description}`.toLowerCase();
        if (!query.split(/\s+/).every((word) => haystack.includes(word))) return false;
      }
      if (filters.jobType !== 'all' && job.jobType !== filters.jobType) return false;
      if (filters.distance > 0 && (distances.get(job.id) ?? Infinity) > filters.distance) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      if (filters.sort === 'nearest') return (distances.get(a.id) ?? Infinity) - (distances.get(b.id) ?? Infinity);
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [allJobs, filters, distances]);

  const openJob = useMemo(() => allJobs.find((job) => job.id === openJobId) ?? null, [allJobs, openJobId]);

  const openDetail = useCallback(
    (job: Job) => {
      setActiveJobId(job.id);
      setSearchParams({ job: job.id });
    },
    [setSearchParams],
  );

  const closeDetail = useCallback(() => setSearchParams({}), [setSearchParams]);

  const handlePinSelect = useCallback(
    (jobId: string | null) => {
      setActiveJobId(jobId);
      if (isDesktop) setSearchParams(jobId ? { job: jobId } : {});
    },
    [isDesktop, setSearchParams],
  );

  // On phones, the carousel's first card is selected by default so a pin is always highlighted
  useEffect(() => {
    if (!isDesktop && mobileView === 'map' && jobs.length > 0 && !jobs.some((j) => j.id === activeJobId)) {
      setActiveJobId(jobs[0].id);
    }
  }, [isDesktop, mobileView, jobs, activeJobId]);

  const hasActiveFilters =
    filters.searchQuery !== '' || filters.jobType !== 'all' || filters.distance > 0;
  const subtitle = `In Bangalore · ${filters.sort === 'nearest' ? (usingRealLocation ? 'nearest to you first' : 'nearest to the city centre first') : 'newest first'}`;

  const list = (
    <JobList
      jobs={jobs}
      distances={distances}
      activeJobId={activeJobId}
      onJobOpen={openDetail}
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      hasActiveFilters={hasActiveFilters}
      onClearFilters={() => setFilters(DEFAULT_FILTERS)}
      subtitle={subtitle}
    />
  );

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <Header />

      <div className="border-b border-border bg-background px-4 py-3 md:px-6">
        <div className="mx-auto max-w-[1600px]">
          <FilterBar filters={filters} onChange={setFilters} />
        </div>
      </div>

      <main className="relative flex min-h-0 flex-1">
        {isDesktop ? (
          <>
            <aside className="w-[440px] shrink-0 border-r border-border bg-background xl:w-[480px]">
              {openJob ? (
                <JobDetail key={openJob.id} job={openJob} distance={distances.get(openJob.id)} onClose={closeDetail} />
              ) : (
                list
              )}
            </aside>
            <div className="relative flex-1">
              <JobMap jobs={jobs} selectedJobId={activeJobId} onJobSelect={handlePinSelect} userLocation={userLocation} />
            </div>
          </>
        ) : (
          <>
            <div className="absolute inset-0">
              <JobMap
                jobs={jobs}
                selectedJobId={activeJobId}
                onJobSelect={handlePinSelect}
                userLocation={userLocation}
                bottomInset={CAROUSEL_HEIGHT}
              />
            </div>

            {mobileView === 'list' && <div className="absolute inset-0 z-20 bg-background">{list}</div>}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 pb-safe">
              <div className="flex justify-center pb-3">
                <button
                  type="button"
                  onClick={() => setMobileView(mobileView === 'map' ? 'list' : 'map')}
                  className="pointer-events-auto flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-ink-foreground shadow-pop transition-transform active:scale-95"
                >
                  {mobileView === 'map' ? <List className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
                  {mobileView === 'map' ? `List${isLoading ? '' : ` · ${jobs.length}`}` : 'Map'}
                </button>
              </div>
              {mobileView === 'map' && (
                <div className="pointer-events-auto">
                  <JobCarousel
                    jobs={jobs}
                    distances={distances}
                    activeJobId={activeJobId}
                    onActiveChange={setActiveJobId}
                    onJobOpen={openDetail}
                  />
                </div>
              )}
            </div>

            {openJob && (
              <div className={cn('fixed inset-0 z-[60] animate-slide-up bg-card')}>
                <JobDetail
                  key={openJob.id}
                  job={openJob}
                  distance={distances.get(openJob.id)}
                  onClose={closeDetail}
                  closeIcon
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
