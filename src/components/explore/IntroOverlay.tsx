import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LocateFixed, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/brand/Logo';

interface IntroOverlayProps {
  jobCount: number;
  areaCount: number;
  isLoading: boolean;
  onExplore: () => void;
  onUseLocation: () => void;
}

/** First visit: a solid column with the promise and two ways in, the live map already moving beside it */
const IntroOverlay = ({ jobCount, areaCount, isLoading, onExplore, onUseLocation }: IntroOverlayProps) => {
  // Scrolling or pressing a key also enters the map
  useEffect(() => {
    const onWheel = (e: WheelEvent) => e.deltaY > 20 && onExplore();
    const onKey = (e: KeyboardEvent) => (e.key === 'Enter' || e.key === 'ArrowDown') && onExplore();
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, [onExplore]);

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-40 flex flex-col justify-end lg:flex-row lg:justify-start"
      // No fade-in: text that starts invisible counts as not painted, which delays
      // the page's Largest Contentful Paint until the animation ends
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } }}
    >
      <header className="pointer-events-auto absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-5 lg:px-10 lg:py-7">
        {/* On phones the header sits over the map, which is light by day, so the wordmark gets its own surface */}
        <div className="max-lg:map-surface max-lg:rounded-full max-lg:py-1 max-lg:pl-1 max-lg:pr-4">
          <Logo />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="map-surface hidden sm:inline-flex" asChild>
            <Link to="/auth">Employer sign in</Link>
          </Button>
          <Button variant="ink" asChild>
            <Link to="/post-a-job">
              <Plus />
              Post a job
            </Link>
          </Button>
        </div>
      </header>

      <section
        aria-labelledby="intro-head"
        className="pointer-events-auto relative flex flex-col justify-end rounded-t-[28px] border-t border-border bg-background px-5 pb-8 pt-7 lg:h-full lg:w-[min(600px,46vw)] lg:rounded-none lg:border-r lg:border-t-0 lg:px-10 lg:pb-16"
      >
        <p className="text-sm text-muted-foreground" role="status">
          {isLoading ? (
            'Loading live jobs…'
          ) : (
            <>
              <span className="num font-semibold text-foreground">{jobCount}</span> jobs pinned across{' '}
              <span className="num font-semibold text-foreground">{areaCount}</span> {areaCount === 1 ? 'area' : 'areas'} of Bangalore
            </>
          )}
        </p>

        <h1 id="intro-head" className="mt-4 max-w-[12ch] text-[44px] font-extrabold leading-[0.98] tracking-[-0.03em] sm:text-6xl lg:text-[76px]">
          Find work 10 minutes from home.
        </h1>

        <p className="mt-5 max-w-[46ch] text-base text-foreground/75 lg:text-lg">
          Every job on JobPins is a pin on a live map of the city. Drop your home on it and see what you can reach on foot, by bike or by car.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={onUseLocation}>
            <LocateFixed />
            Show jobs near me
          </Button>
          <Button size="lg" variant="outline" onClick={onExplore}>
            Explore the map
          </Button>
        </div>
      </section>
    </motion.div>
  );
};

export default IntroOverlay;
