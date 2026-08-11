import { useEffect, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

export function useCountUp(target: number, durationMs = 600, startDelayMs = 0): number {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(reduceMotion ? target : 0);

  useEffect(() => {
    if (reduceMotion) {
      setValue(target);
      return;
    }

    let raf = 0;
    let startTime = 0;

    const timeoutId = setTimeout(() => {
      const tick = (now: number) => {
        if (!startTime) startTime = now;
        const progress = Math.min((now - startTime) / durationMs, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, startDelayMs);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, startDelayMs, reduceMotion]);

  return value;
}
