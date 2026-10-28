import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, LogOut, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/brand/Logo';
import FilterBar, { DEFAULT_FILTERS } from '@/components/FilterBar';
import type { JobMapHandle } from '@/components/JobMap';
import JobList, { AreaCount } from '@/components/JobList';
import JobDetail from '@/components/JobDetail';
import CommuteCard from '@/components/explore/CommuteCard';
import IntroOverlay from '@/components/explore/IntroOverlay';
import BottomSheet, { SheetSnap } from '@/components/explore/BottomSheet';
import CommuteIcon from '@/components/CommuteIcon';
import { FilterState, Job } from '@/types';
import { fetchJobs } from '@/services/jobService';
import { BANGALORE_CENTER, calculateDistance, nearBangaloreOrCenter } from '@/lib/distance';
import { commuteMinutes, reachKm } from '@/lib/commute';
import { useIsDesktop, useIsWide } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

// mapbox-gl is most of the JavaScript, so the map loads in its own chunk while the intro paints
const JobMap = lazy(() => import('@/components/JobMap'));

type LatLng = { lat: number; lng: number };

const HOME_KEY = 'jobpins.home';
const INTRO_KEY = 'jobpins.introSeen';
const PANEL_WIDTH = 420;
const DETAIL_WIDTH = 440;

const readHome = (): LatLng => {
  try {
    const saved = JSON.parse(localStorage.getItem(HOME_KEY) || 'null');
    if (typeof saved?.lat === 'number' && typeof saved?.lng === 'number') return saved;
  } catch {
    // Ignore unreadable storage
  }
  return BANGALORE_CENTER;
};

const panelMotion = {
  initial: { opacity: 0, x: -24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1], delay: 0.15 } },
  exit: { opacity: 0, x: -24 },
} as const;

const ExploreActions = () => {
  const { user, signOut } = useAuth();
  return (
    <div className="flex items-center gap-2">
      {user ? (
        <>
          <Button variant="ghost" size="icon" className="map-surface h-10 w-10 lg:hidden" asChild>
            <Link to="/my-jobs" aria-label="My listings">
              <LayoutDashboard />
            </Link>
          </Button>
          <Button variant="ghost" className="map-surface hidden lg:inline-flex" asChild>
            <Link to="/my-jobs">
              <LayoutDashboard />
              My listings
            </Link>
          </Button>
          {/* Phones have room for one icon here; sign out is in the My listings header */}
          <Button variant="ghost" size="icon" className="map-surface hidden h-10 w-10 lg:inline-flex" onClick={signOut} aria-label="Sign out">
            <LogOut />
          </Button>
        </>
      ) : (
        <Button variant="ghost" className="map-surface hidden lg:inline-flex" asChild>
          <Link to="/auth">Employer sign in</Link>
        </Button>
      )}
      <Button variant="ink" className="shadow-lift max-sm:h-10 max-sm:px-3.5" asChild>
        <Link to="/post-a-job">
          <Plus />
          <span className="hidden sm:inline">Post a job</span>
          <span className="max-[359px]:sr-only sm:hidden">Post</span>
        </Link>
      </Button>
    </div>
  );
};

const Index = () => {
  const isDesktop = useIsDesktop();
  const isWide = useIsWide();
  const mapRef = useRef<JobMapHandle>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const openJobId = searchParams.get('job');
  const [intro, setIntro] = useState(() => !openJobId && sessionStorage.getItem(INTRO_KEY) !== '1');
  const [home, setHomeState] = useState<LatLng>(readHome);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [activeJobId, setActiveJobId] = useState<string | null>(openJobId);
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('half');
  // Start the map only once the intro has painted, so its parsing doesn't hold up the first screen
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const start = () => setShowMap(true);
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(start, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(start, 300);
    return () => clearTimeout(id);
  }, []);

  const { data: allJobs = [], isLoading, error, refetch } = useQuery({ queryKey: ['jobs'], queryFn: fetchJobs });

  const setHome = useCallback((point: LatLng) => {
    setHomeState(point);
    try {
      localStorage.setItem(HOME_KEY, JSON.stringify(point));
    } catch {
      // Storage may be unavailable in private mode
    }
  }, []);

  const enterExplore = useCallback(() => {
    sessionStorage.setItem(INTRO_KEY, '1');
    setIntro(false);
  }, []);

  const useMyLocation = useCallback(() => {
    enterExplore();
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        const near = nearBangaloreOrCenter({ lat: coords.latitude, lng: coords.longitude });
        setHome(near);
        setFilters((f) => (f.maxMinutes ? f : { ...f, maxMinutes: 30 }));
        mapRef.current?.flyTo(near, 13.2);
      },
      () => undefined,
      { timeout: 10000 },
    );
  }, [enterExplore, setHome]);

  // If location access was granted before, quietly start from the visitor's position
  useEffect(() => {
    if (localStorage.getItem(HOME_KEY)) return;
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((status) => {
        if (status.state !== 'granted') return;
        navigator.geolocation.getCurrentPosition(({ coords }) =>
          setHome(nearBangaloreOrCenter({ lat: coords.latitude, lng: coords.longitude })),
        );
      })
      .catch(() => undefined);
  }, [setHome]);

  const distances = useMemo(() => {
    const map = new Map<string, number>();
    allJobs.forEach((job) => {
      if (job.location) map.set(job.id, calculateDistance(home.lat, home.lng, job.location.latitude, job.location.longitude));
    });
    return map;
  }, [allJobs, home]);

  const matchIds = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();
    const words = query ? query.split(/\s+/) : [];
    return new Set(
      allJobs
        .filter((job) => {
          if (filters.jobType !== 'all' && job.jobType !== filters.jobType) return false;
          if (!words.length) return true;
          const haystack = `${job.title} ${job.company?.name ?? ''} ${job.location?.address ?? ''} ${job.description}`.toLowerCase();
          return words.every((word) => haystack.includes(word));
        })
        .map((job) => job.id),
    );
  }, [allJobs, filters.searchQuery, filters.jobType]);

  const reachIds = useMemo(() => {
    if (!filters.maxMinutes) return null;
    return new Set(
      allJobs
        .filter((job) => distances.has(job.id) && commuteMinutes(distances.get(job.id)!, filters.mode) <= filters.maxMinutes)
        .map((job) => job.id),
    );
  }, [allJobs, distances, filters.maxMinutes, filters.mode]);

  const jobs = useMemo(() => {
    const list = allJobs.filter((job) => matchIds.has(job.id) && (!reachIds || reachIds.has(job.id)));
    return list.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      if (filters.sort === 'nearest') return (distances.get(a.id) ?? Infinity) - (distances.get(b.id) ?? Infinity);
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [allJobs, matchIds, reachIds, distances, filters.sort]);

  const areas = useMemo<AreaCount[]>(() => {
    const byArea = new Map<string, { count: number; lat: number; lng: number }>();
    allJobs.forEach((job) => {
      const name = job.location?.address?.trim();
      if (!name || !job.location) return;
      const entry = byArea.get(name) ?? { count: 0, lat: 0, lng: 0 };
      entry.count += 1;
      entry.lat += job.location.latitude;
      entry.lng += job.location.longitude;
      byArea.set(name, entry);
    });
    return [...byArea.entries()]
      .map(([name, e]) => ({ name, count: e.count, lat: e.lat / e.count, lng: e.lng / e.count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 10);
  }, [allJobs]);

  const openJob = useMemo(() => allJobs.find((job) => job.id === openJobId) ?? null, [allJobs, openJobId]);

  const openDetail = useCallback(
    (job: Job) => {
      setActiveJobId(job.id);
      setSearchParams({ job: job.id });
      if (intro) enterExplore();
    },
    [setSearchParams, intro, enterExplore],
  );

  const closeDetail = useCallback(() => setSearchParams({}), [setSearchParams]);

  const handlePinSelect = useCallback(
    (jobId: string | null) => {
      setActiveJobId(jobId);
      setSearchParams(jobId ? { job: jobId } : {});
      if (jobId && intro) enterExplore();
    },
    [setSearchParams, intro, enterExplore],
  );

  const hasActiveFilters = filters.searchQuery !== '' || filters.jobType !== 'all' || filters.maxMinutes > 0;
  const radiusKm = filters.maxMinutes ? reachKm(filters.maxMinutes, filters.mode) : 0;
  const reachableCount = reachIds ? [...reachIds].filter((id) => matchIds.has(id)).length : matchIds.size;

  const commuteCard = <CommuteCard filters={filters} onChange={setFilters} reachableCount={reachableCount} />;

  const list = (scrollable: boolean) => (
    <JobList
      jobs={jobs}
      distances={distances}
      mode={filters.mode}
      activeJobId={activeJobId}
      hoveredJobId={hoveredJobId}
      onJobOpen={openDetail}
      onJobHover={setHoveredJobId}
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      hasActiveFilters={hasActiveFilters}
      onClearFilters={() => setFilters({ ...DEFAULT_FILTERS, mode: filters.mode })}
      sort={filters.sort}
      onSortChange={(sort) => setFilters({ ...filters, sort })}
      areas={areas}
      onAreaJump={(area) => {
        mapRef.current?.flyTo(area, 14.5);
        if (!isDesktop) setSheetSnap('peek');
      }}
      header={commuteCard}
      scrollable={scrollable}
      showCount={isDesktop}
    />
  );

  const detail = openJob && (
    <JobDetail
      key={openJob.id}
      job={openJob}
      distance={distances.get(openJob.id)}
      mode={filters.mode}
      onClose={closeDetail}
      closeIcon={!isDesktop || isWide}
    />
  );

  // On wide screens the detail docks beside the list, so the map keeps both panels clear
  const detailBeside = isDesktop && isWide && !!openJob;
  const mapLeft = PANEL_WIDTH + (detailBeside ? DETAIL_WIDTH : 0);

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-background">
      <div className="absolute inset-0">
        <Suspense fallback={null}>
          {showMap && <JobMap
            ref={mapRef}
            jobs={allJobs}
            matchIds={matchIds}
            reachIds={reachIds}
            selectedJobId={activeJobId}
            hoveredJobId={hoveredJobId}
            onJobSelect={handlePinSelect}
            onJobHover={setHoveredJobId}
            home={home}
            onHomeChange={setHome}
            radiusKm={intro ? 0 : radiusKm}
            intro={intro}
            padding={isDesktop ? { left: intro ? Math.min(600, window.innerWidth * 0.46) : mapLeft, top: 72 } : { top: 124, bottom: window.innerHeight * 0.5 }}
            controlsClassName={isDesktop ? 'bottom-10 right-4' : 'right-3 top-[124px]'}
          />}
        </Suspense>
      </div>

      <AnimatePresence>
        {intro && (
          <IntroOverlay
            key="intro"
            jobCount={allJobs.length}
            areaCount={Math.max(areas.length, allJobs.length ? 1 : 0)}
            isLoading={isLoading}
            onExplore={enterExplore}
            onUseLocation={useMyLocation}
          />
        )}
      </AnimatePresence>

      {/* Actions over the map, top right */}
      <AnimatePresence>
        {!intro && isDesktop && (
          <motion.div
            key="actions"
            className="absolute right-4 top-4 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.15, duration: 0.22 } }}
            exit={{ opacity: 0 }}
          >
            <ExploreActions />
          </motion.div>
        )}
      </AnimatePresence>

      {isDesktop ? (
        <AnimatePresence>
          {!intro && (
            <motion.aside
              key="panel"
              {...panelMotion}
              aria-label="Jobs"
              className="absolute bottom-0 left-0 top-0 z-20 flex flex-col border-r border-border bg-card shadow-pop"
              style={{ width: PANEL_WIDTH }}
            >
              <div className="shrink-0 space-y-4 border-b border-border px-4 pb-4 pt-4">
                <div className="flex h-10 items-center justify-between">
                  <Logo />
                  <span className="text-sm text-muted-foreground">Bangalore</span>
                </div>
                <FilterBar filters={filters} onChange={setFilters} />
              </div>
              <div className="relative min-h-0 flex-1">
                <AnimatePresence mode="wait" initial={false}>
                  {openJob && !isWide ? (
                    <motion.div
                      key={`detail-${openJob.id}`}
                      className="h-full"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {detail}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list"
                      className="h-full"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      {list(true)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      ) : (
        !intro && (
          <>
            <div className="absolute inset-x-0 top-0 z-20 space-y-2 px-3 pt-3">
              <div className="flex items-center gap-2">
                <div className="map-surface flex h-11 shrink-0 items-center rounded-full px-1">
                  <Logo compact />
                </div>
                <FilterBar filters={filters} onChange={setFilters} className="min-w-0 flex-1 [&>div]:hidden" />
                <div className="shrink-0">
                  <ExploreActions />
                </div>
              </div>
              <FilterBar filters={filters} onChange={setFilters} className="[&>label]:hidden" />
            </div>

            <BottomSheet
              snap={sheetSnap}
              onSnapChange={setSheetSnap}
              header={
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-xl font-bold">
                    {isLoading ? 'Finding jobs…' : `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'}`}
                    <span className="ml-1.5 font-sans text-sm font-medium text-muted-foreground">
                      {filters.maxMinutes ? `within ${filters.maxMinutes} min` : 'in Bangalore'}
                    </span>
                  </p>
                  <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground/85">
                    <CommuteIcon mode={filters.mode} className="h-3.5 w-3.5" />
                    {filters.maxMinutes ? `${filters.maxMinutes} min` : 'Any'}
                  </span>
                </div>
              }
            >
              {list(false)}
            </BottomSheet>

            <AnimatePresence>
              {openJob && (
                <motion.div
                  key="mobile-detail"
                  className="fixed inset-0 z-[60] bg-card"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                >
                  {detail}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )
      )}

      {/* Wide screens: the detail docks beside the list */}
      <AnimatePresence>
        {!intro && detailBeside && openJob && (
          <motion.section
            key={`beside-${openJob.id}`}
            aria-label="Job detail"
            className="absolute bottom-0 top-0 z-[19] border-r border-border bg-background shadow-pop"
            style={{ left: PANEL_WIDTH, width: DETAIL_WIDTH }}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            {detail}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
