import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
  interactive?: boolean;
}

export function Card({ children, className, padded = true, interactive = false, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-border rounded-xl shadow-soft transition-[box-shadow,border-color,transform] duration-200 ease-out',
        padded && 'p-6',
        interactive && 'cursor-pointer hover:shadow-soft-lg hover:border-gold/40 hover:-translate-y-[1px]',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-navy tracking-wide">{title}</h3>
      {action}
    </div>
  );
}
