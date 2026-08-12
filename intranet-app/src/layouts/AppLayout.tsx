import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { FloatingAIButton } from '../components/FloatingAIButton';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { pageTransition } from '../utils/motionVariants';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const { initial, animate, transition } = pageTransition(reduceMotion);

  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenMobileMenu={() => setMobileOpen(true)} />
        {/* Sem AnimatePresence/exit: a página antiga sai de cena na hora do clique
            (nunca fica montada junto da nova), e só a nova página entra com um
            fade+lift bem curto. Isso evita ter duas telas pesadas renderizadas
            ao mesmo tempo e faz o clique parecer instantâneo. */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={location.pathname}
            initial={initial}
            animate={animate}
            transition={transition}
            className="p-4 lg:p-8"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <FloatingAIButton />
    </div>
  );
}
