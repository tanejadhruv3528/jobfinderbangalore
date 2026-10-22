import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, LogOut, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/brand/Logo';
import FilterBar, { DEFAULT_FILTERS } from '@/components/FilterBar';
import JobMap, { JobMapHandle } from '@/components/JobMap';
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
import { useIsDesktop } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

type LatLng = { lat: number; lng: number };

const HOME_KEY = 'jobpins.home';
const INTRO_KEY = 'jobpins.introSeen';
const PANEL_WIDTH = 440;

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
  animate: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 260, damping: 30, delay: 0.25 } },
  exit: { opacity: 0, x: -24 },
} as const;

const ExploreActions = () => {
  const { user, signOut } = useAuth();
  return (
    <div className="flex items-center gap-2">
      {user ? (
        <>
          <Button variant="ghost" size="icon" className="glass h-9 w-9 hover:bg-white/10 lg:hidden" asChild>
            <Link to="/my-jobs" aria-label="My listings">
              <LayoutDashboard />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="glass hidden hover:bg-white/10 lg:inline-flex" asChild>
            <Link to="/my-jobs">
              <LayoutDashboard />
              My listings
            </Link>
          </Button>
          {/* Phones have room for one icon here; sign out is in the My listings header */}
          <Button variant="ghost" size="icon" className="glass hidden h-9 w-9 hover:bg-white/10 lg:inline-flex" onClick={signOut} aria-label="Sign out">
            <LogOut />
          </Button>
        </>
      ) : (
        <Button variant="ghost" size="sm" className="glass hidden hover:bg-white/10 lg:inline-flex" asChild>
          <Link to="/auth">Employer sign in</Link>
        </Button>
      )}
      <Button variant="ink" size="sm" className="shadow-lift" asChild>
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
  const mapRef = useRef<JobMapHandle>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const openJobId = searchParams.get('job');
  const [intro, setIntro] = useState(() => !openJobId && sessionStorage.getItem(INTRO_KEY) !== '1');
  const [home, setHomeState] = useState<LatLng>(readHome);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [activeJobId, setActiveJobId] = useState<string | null>(openJobId);
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('half');

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
    />
  );

  const detail = openJob && (
    <JobDetail
      key={openJob.id}
      job={openJob}
      distance={distances.get(openJob.id)}
      mode={filters.mode}
      onClose={closeDetail}
      closeIcon={!isDesktop}
      className="bg-transparent"
    />
  );

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-background">
      <div className="absolute inset-0">
        <JobMap
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
          padding={isDesktop ? { left: PANEL_WIDTH + 16, top: 80 } : { top: 130, bottom: window.innerHeight * 0.5 }}
          controlsClassName={isDesktop ? 'bottom-10 right-4' : 'right-3 top-[132px]'}
        />
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

      <AnimatePresence>
        {!intro && (
          <motion.div
            key="topbar"
            className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-3 lg:px-4 lg:pt-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.15, type: 'spring', stiffness: 260, damping: 30 } }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="flex items-start gap-3">
              <div className="pointer-events-auto glass hidden h-12 shrink-0 items-center rounded-full pl-1.5 pr-4 shadow-lift lg:flex" style={{ width: PANEL_WIDTH }}>
                <Logo />
                <span className="ml-auto text-xs text-muted-foreground">Bangalore</span>
              </div>
              <div className="pointer-events-auto glass flex h-12 shrink-0 items-center rounded-full px-1.5 shadow-lift lg:hidden">
                <Logo compact />
              </div>
              <FilterBar
                filters={filters}
                onChange={setFilters}
                className="pointer-events-auto min-w-0 flex-1 max-lg:[&>div]:hidden"
              />
              <div className="pointer-events-auto shrink-0 pt-1.5 lg:pt-1">
                <ExploreActions />
              </div>
            </div>
            {/* Job type chips sit on their own row on small screens */}
            <div className="pointer-events-auto mt-2 lg:hidden">
              <FilterBar filters={filters} onChange={setFilters} className="[&>label]:hidden" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isDesktop ? (
        <AnimatePresence>
          {!intro && (
            <motion.aside
              key="panel"
              {...panelMotion}
              className="glass absolute bottom-4 left-4 top-[80px] z-20 overflow-hidden rounded-[28px] shadow-pop"
              style={{ width: PANEL_WIDTH }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {openJob ? (
                  <motion.div
                    key={`detail-${openJob.id}`}
                    className="h-full"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                  >
                    {detail}
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    className="h-full"
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                  >
                    {list(true)}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.aside>
          )}
        </AnimatePresence>
      ) : (
        !intro && (
          <>
            <BottomSheet
              snap={sheetSnap}
              onSnapChange={setSheetSnap}
              header={
                <div className="flex items-center justify-between">
                  <p className="font-display text-xl font-bold">
                    {isLoading ? 'Finding jobs…' : `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'}`}
                    <span className="ml-1.5 font-sans text-sm font-medium text-muted-foreground">
                      {filters.maxMinutes ? `within ${filters.maxMinutes} min` : 'in Bangalore'}
                    </span>
                  </p>
                  <span className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-foreground/80">
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
                  className="fixed inset-0 z-[60] bg-background"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                >
                  {detail}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )
      )}
    </div>
  );
};

export default Index;
