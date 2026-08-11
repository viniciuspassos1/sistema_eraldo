import { useReducedMotion as useMotionReducedMotion } from 'motion/react';

// Wrapper fino sobre o hook nativo do motion — centraliza o import para que
// todo o app consulte a mesma preferência de prefers-reduced-motion.
export function useReducedMotion(): boolean {
  return useMotionReducedMotion() ?? false;
}
