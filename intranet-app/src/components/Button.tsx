import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, Check } from 'lucide-react';
import { cn } from '../utils/cn';

type ButtonStatus = 'idle' | 'loading' | 'success';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md';
  loading?: boolean;
  /** 'success' mostra um check animado por instantes — use após confirmar uma ação (salvar, concluir). */
  status?: ButtonStatus;
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
  status = 'idle',
  disabled,
  className,
  ...rest
}: ButtonProps) {
  const isLoading = loading || status === 'loading';
  const isSuccess = status === 'success';

  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[background-color,transform,opacity] duration-150 ease-out active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
        isSuccess ? 'bg-emerald-600 text-white' : variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isSuccess ? (
          <motion.span
            key="success"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="flex items-center gap-2"
          >
            <Check className="w-3.5 h-3.5" />
            {children}
          </motion.span>
        ) : (
          <motion.span
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
