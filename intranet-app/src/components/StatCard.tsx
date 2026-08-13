import type { LucideIcon } from 'lucide-react';
import { Card } from './Card';
import { Sparkline } from './Sparkline';
import { useCountUp } from '../hooks/useCountUp';

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'navy',
  countDelay = 0,
  trend,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: 'navy' | 'gold';
  countDelay?: number;
  trend?: number[];
}) {
  const numericValue = typeof value === 'number' ? value : Number(value);
  const isCountable = Number.isFinite(numericValue) && typeof value !== 'string';
  const displayed = useCountUp(isCountable ? numericValue : 0, 550, countDelay);

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
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-semibold text-navy leading-none tabular-nums">
          {isCountable ? displayed : value}
        </p>
        <p className="text-xs text-text-secondary mt-1.5">{label}</p>
      </div>
      {trend && trend.length > 1 && <Sparkline data={trend} tone={tone} className="w-14 h-7 shrink-0" />}
    </Card>
  );
}
