import { initials } from '../utils/format';
import { cn } from '../utils/cn';

export function Avatar({ nome, size = 'md' }: { nome: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
  };
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-navy text-white font-semibold shrink-0',
        sizes[size]
      )}
    >
      {initials(nome)}
    </div>
  );
}
