import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md';
  loading?: boolean;
}

const variants: Record<string, string> = {
  primary: 'bg-navy text-white hover:bg-navy-light',
  secondary: 'bg-gold text-navy font-semibold hover:bg-gold-light',
  ghost: 'text-navy hover:bg-black/5',
  outline: 'border border-border text-navy hover:bg-black/5',
};

const sizes: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[background-color,transform,opacity] duration-150 ease-out active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}
