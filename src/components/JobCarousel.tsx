import { useEffect, useRef } from 'react';
import JobCard from '@/components/JobCard';
import { Job } from '@/types';

interface JobCarouselProps {
  jobs: Job[];
  distances: Map<string, number>;
  activeJobId: string | null;
  onActiveChange: (jobId: string) => void;
  onJobOpen: (job: Job) => void;
}

/** Swipeable row of job cards over the mobile map, kept in sync with the selected pin. */
const JobCarousel = ({ jobs, distances, activeJobId, onActiveChange, onJobOpen }: JobCarouselProps) => {
  const scroller = useRef<HTMLDivElement>(null);
  const refs = useRef<Map<string, HTMLElement>>(new Map());
  const settleTimer = useRef<ReturnType<typeof setTimeout>>();
  const programmatic = useRef(false);

  // A pin tapped on the map scrolls its card into view
  useEffect(() => {
    const el = activeJobId ? refs.current.get(activeJobId) : null;
    const box = scroller.current;
    if (!el || !box) return;
    const target = el.offsetLeft - (box.clientWidth - el.clientWidth) / 2;
    if (Math.abs(box.scrollLeft - target) < 4) return;
    programmatic.current = true;
    box.scrollTo({ left: target, behavior: 'smooth' });
  }, [activeJobId]);

  // When a swipe settles, select the card closest to the centre
  const handleScroll = () => {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (programmatic.current) {
        programmatic.current = false;
        return;
      }
      const box = scroller.current;
      if (!box) return;
      const centre = box.scrollLeft + box.clientWidth / 2;
      let closest: string | null = null;
      let best = Infinity;
      refs.current.forEach((el, id) => {
        const d = Math.abs(el.offsetLeft + el.clientWidth / 2 - centre);
        if (d < best) {
          best = d;
          closest = id;
        }
      });
      if (closest && closest !== activeJobId) onActiveChange(closest);
    }, 140);
  };

  if (jobs.length === 0) return null;

  return (
    <div
      ref={scroller}
      onScroll={handleScroll}
      className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto px-[7.5vw] pb-1 pt-2"
    >
      {jobs.map((job) => (
        <div
          key={job.id}
          ref={(el) => {
            if (el) refs.current.set(job.id, el);
            else refs.current.delete(job.id);
          }}
          className="w-[85vw] max-w-[380px] shrink-0 snap-center"
        >
          <JobCard
            job={job}
            distance={distances.get(job.id)}
            isSelected={job.id === activeJobId}
            onSelect={onJobOpen}
            className="h-full shadow-pop"
          />
        </div>
      ))}
    </div>
  );
};

export default JobCarousel;
