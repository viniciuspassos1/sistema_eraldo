import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export function Card({ children, className, padded = true, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-border rounded-xl shadow-soft',
        padded && 'p-6',
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
