import { Bike, Car, Footprints } from 'lucide-react';
import { CommuteMode } from '@/lib/commute';

const ICONS = { walk: Footprints, bike: Bike, car: Car };

const CommuteIcon = ({ mode, className }: { mode: CommuteMode; className?: string }) => {
  const Icon = ICONS[mode];
  return <Icon className={className} aria-hidden="true" />;
};

export default CommuteIcon;
