import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

type BadgeTone = 'navy' | 'gold' | 'success' | 'warning' | 'danger' | 'neutral';

const toneClasses: Record<BadgeTone, string> = {
  navy: 'bg-navy/10 text-navy',
  gold: 'bg-gold/15 text-[#8a6d34]',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  neutral: 'bg-black/5 text-text-secondary',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        toneClasses[tone]
      )}
    >
      {children}
    </span>
  );
}
