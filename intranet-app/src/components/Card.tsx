import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> {
  children: ReactNode;
  padded?: boolean;
  interactive?: boolean;
  /** Se informado, o card vira um <button> de verdade em vez de <div> —
   * clicável com teclado, foco visível, semântica correta. */
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
}

export function Card({ children, className, padded = true, interactive = false, onClick, ...rest }: CardProps) {
  const classes = cn(
    'bg-white border border-border rounded-xl shadow-soft transition-[box-shadow,border-color,transform] duration-200 ease-out',
    padded && 'p-6',
    (interactive || onClick) &&
      'cursor-pointer hover:shadow-soft-lg hover:border-gold/40 hover:-translate-y-[1px] hover:scale-[1.012]',
    onClick && 'w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
    className
  );

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
        {children}
      </button>
    );
  }

  return (
    <div className={classes} {...rest}>
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
