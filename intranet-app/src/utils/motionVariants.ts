import type { Transition, Variants } from 'motion/react';

// Stagger de entrada usado em listas/grids/dashboards.
// Quando reduceMotion é true, remove deslocamento e stagger — só um fade rápido.
export function staggerContainer(staggerChildren = 0.06, delayChildren = 0, reduceMotion = false): Variants {
  if (reduceMotion) {
    return { hidden: {}, visible: { transition: { staggerChildren: 0, delayChildren: 0 } } };
  }
  return { hidden: {}, visible: { transition: { staggerChildren, delayChildren } } };
}

export function fadeUpItem(reduceMotion = false): Variants {
  if (reduceMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.15 } },
    };
  }
  return {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  };
}

// Transição padrão entre páginas (usada no AppLayout).
export function pageTransition(reduceMotion = false): {
  initial: Record<string, number>;
  animate: Record<string, number>;
  exit: Record<string, number>;
  transition: Transition;
} {
  if (reduceMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.12 },
    };
  }
  return {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
    transition: { duration: 0.2, ease: 'easeOut' },
  };
}
