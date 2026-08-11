import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md';
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

export function Button({ children, variant = 'primary', size = 'md', className, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
