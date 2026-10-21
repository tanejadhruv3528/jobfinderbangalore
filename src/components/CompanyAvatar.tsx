import { avatarColors, initials } from '@/lib/format';
import { cn } from '@/lib/utils';

interface CompanyAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'h-10 w-10 text-sm rounded-xl',
  md: 'h-12 w-12 text-base rounded-2xl',
  lg: 'h-16 w-16 text-xl rounded-2xl',
};

const CompanyAvatar = ({ name, size = 'sm', className }: CompanyAvatarProps) => {
  const { bg, fg } = avatarColors(name || '?');
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center font-display font-bold', SIZES[size], className)}
      style={{ backgroundColor: bg, color: fg }}
      aria-hidden="true"
    >
      {initials(name || '?')}
    </div>
  );
};

export default CompanyAvatar;
