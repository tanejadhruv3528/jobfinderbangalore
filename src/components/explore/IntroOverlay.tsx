import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, LocateFixed, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/brand/Logo';

const PHRASES = ['10 minutes from home.', 'in Koramangala.', 'a bike ride away.', 'in Whitefield.', 'near you.'];

interface IntroOverlayProps {
  jobCount: number;
  areaCount: number;
  isLoading: boolean;
  onExplore: () => void;
  onUseLocation: () => void;
}

const AnimatedNumber = ({ value }: { value: number }) => {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1200);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{shown}</>;
};

const IntroOverlay = ({ jobCount, areaCount, isLoading, onExplore, onUseLocation }: IntroOverlayProps) => {
  const [phrase, setPhrase] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPhrase((p) => (p + 1) % PHRASES.length), 2400);
    return () => clearInterval(id);
  }, []);

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
      className="absolute inset-0 z-40 flex flex-col"
      // No fade-in: text that starts invisible counts as not painted, which delays
      // the page's Largest Contentful Paint until the animation ends
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } }}
    >
      {/* Vignette so text stays legible over any lighting */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_55%,hsl(230_26%_5%/0.15),hsl(230_26%_5%/0.85)_75%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[hsl(230_26%_5%)] via-[hsl(230_26%_5%/0.7)] to-transparent" />

      <header className="relative flex items-center justify-between px-5 py-5 md:px-10 md:py-7">
        <Logo />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link to="/auth">Employer sign in</Link>
          </Button>
          <Button variant="ink" size="sm" asChild>
            <Link to="/post-a-job">
              <Plus />
              Post a job
            </Link>
          </Button>
        </div>
      </header>

      <div className="relative mt-auto px-5 pb-10 md:px-10 md:pb-16">
        <motion.div
          initial={{ y: 30 }}
          animate={{ y: 0 }}
          exit={{ opacity: 0, y: -40, transition: { duration: 0.5 } }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          className="max-w-4xl"
        >
          <div className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm text-foreground/85">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            {isLoading ? (
              'Loading live jobs…'
            ) : (
              <span>
                <span className="font-semibold text-foreground">
                  <AnimatedNumber value={jobCount} />
                </span>{' '}
                jobs pinned across{' '}
                <span className="font-semibold text-foreground">
                  <AnimatedNumber value={areaCount} />
                </span>{' '}
                {areaCount === 1 ? 'area' : 'areas'} of Bangalore
              </span>
            )}
          </div>

          <h1 className="mt-6 text-[44px] font-extrabold leading-[0.95] tracking-[-0.03em] sm:text-7xl lg:text-[104px]">
            Find work
            <br />
            <span className="relative inline-block h-[1.05em] overflow-hidden align-bottom">
              <AnimatePresence mode="wait">
                <motion.span
                  key={phrase}
                  className="text-gradient inline-block pb-2"
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '-100%', opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  {PHRASES[phrase]}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-foreground/70 md:text-xl">
            Every job on JobPins is a pin on a live map of the city. Drop your home on it and see what you can reach on foot, by bike or by car.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-14 px-8 text-base" onClick={onUseLocation}>
              <LocateFixed />
              Show jobs near me
            </Button>
            <Button size="lg" variant="outline" className="glass h-14 border-white/15 px-8 text-base hover:bg-white/10" onClick={onExplore}>
              Explore the map
              <ArrowRight />
            </Button>
          </div>
        </motion.div>

        <motion.button
          type="button"
          onClick={onExplore}
          className="absolute bottom-8 right-10 hidden flex-col items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-foreground/50 hover:text-foreground md:flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
        >
          Scroll to explore
          <motion.span
            className="block h-10 w-px bg-gradient-to-b from-foreground/60 to-transparent"
            animate={{ scaleY: [0.3, 1, 0.3], originY: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default IntroOverlay;
