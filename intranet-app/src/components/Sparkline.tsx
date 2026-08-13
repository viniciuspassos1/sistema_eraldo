import { useId } from 'react';
import { cn } from '../utils/cn';

interface SparklineProps {
  data: number[];
  tone?: 'navy' | 'gold';
  className?: string;
}

export function Sparkline({ data, tone = 'navy', className }: SparklineProps) {
  const id = useId();
  const width = 100;
  const height = 28;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const linePath = `M${points.join(' L')}`;
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  const stroke = tone === 'gold' ? '#b59452' : '#192742';
  const fillId = `sparkline-fill-${id}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('overflow-visible', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${fillId})`} stroke="none" />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
