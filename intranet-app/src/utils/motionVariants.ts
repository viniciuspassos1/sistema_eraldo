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
// Só anima a ENTRADA da página nova — a página anterior é desmontada na hora,
// sem animação de saída, pra nunca ter duas telas pesadas montadas ao mesmo
// tempo nem atraso percebido no clique.
export function pageTransition(reduceMotion = false): {
  initial: Record<string, number>;
  animate: Record<string, number>;
  transition: Transition;
} {
  if (reduceMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.1 },
    };
  }
  return {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.18, ease: 'easeOut' },
  };
}
