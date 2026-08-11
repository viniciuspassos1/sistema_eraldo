import type { LucideIcon } from 'lucide-react';
import { Card } from './Card';

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'navy',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: 'navy' | 'gold';
}) {
  return (
    <Card className="flex items-center gap-4">
      <div
        className={
          tone === 'gold'
            ? 'w-11 h-11 rounded-lg bg-gold/15 flex items-center justify-center shrink-0'
            : 'w-11 h-11 rounded-lg bg-navy/8 flex items-center justify-center shrink-0'
        }
      >
        <Icon className={tone === 'gold' ? 'w-5 h-5 text-[#8a6d34]' : 'w-5 h-5 text-navy'} strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-navy leading-none">{value}</p>
        <p className="text-xs text-text-secondary mt-1.5">{label}</p>
      </div>
    </Card>
  );
}
