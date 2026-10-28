import { useEffect, useState } from 'react';
import { animate, motion, useDragControls, useMotionValue, PanInfo } from 'framer-motion';

export type SheetSnap = 'peek' | 'half' | 'full';

interface BottomSheetProps {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  /** Always-visible top of the sheet (drag handle area) */
  header: React.ReactNode;
  children: React.ReactNode;
}

const TOP_GAP = 76;
const PEEK_HEIGHT = 132;

/** Draggable sheet over the mobile map with peek, half and full stops */
const BottomSheet = ({ snap, onSnapChange, header, children }: BottomSheetProps) => {
  const [vh, setVh] = useState(() => window.innerHeight);
  const controls = useDragControls();
  const sheetHeight = vh - TOP_GAP;
  const offsets: Record<SheetSnap, number> = {
    full: 0,
    half: sheetHeight - vh * 0.52,
    peek: sheetHeight - PEEK_HEIGHT,
  };
  const y = useMotionValue(offsets[snap]);

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const controlsAnim = animate(y, offsets[snap], { type: 'spring', stiffness: 380, damping: 38 });
    return () => controlsAnim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, vh]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    // Project where a flick would land, then settle on the nearest stop
    const projected = y.get() + info.velocity.y * 0.2;
    const nearest = (Object.keys(offsets) as SheetSnap[]).reduce((best, key) =>
      Math.abs(offsets[key] - projected) < Math.abs(offsets[best] - projected) ? key : best,
    );
    if (nearest === snap) animate(y, offsets[snap], { type: 'spring', stiffness: 380, damping: 38 });
    else onSnapChange(nearest);
  };

  return (
    <motion.div
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-[28px] border-t border-border bg-card shadow-pop"
      style={{ height: sheetHeight, y }}
      drag="y"
      dragControls={controls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: offsets.peek }}
      dragElastic={0.08}
      onDragEnd={handleDragEnd}
    >
      <div
        className="shrink-0 cursor-grab touch-none px-4 pb-2 pt-2.5 active:cursor-grabbing"
        onPointerDown={(e) => controls.start(e)}
        onClick={() => snap === 'peek' && onSnapChange('half')}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-foreground/25" />
        {header}
      </div>
      {/* At the half stop the lower part of the sheet is off screen, so pad the scroll area to keep the end reachable */}
      <div
        className={snap === 'peek' ? 'min-h-0 flex-1 overflow-hidden' : 'min-h-0 flex-1 overflow-y-auto overscroll-contain'}
        style={{ paddingBottom: snap === 'half' ? offsets.half : 0 }}
      >
        {children}
      </div>
    </motion.div>
  );
};

export default BottomSheet;
