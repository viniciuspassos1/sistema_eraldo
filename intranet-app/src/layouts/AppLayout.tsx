import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
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
  const { initial, animate, exit, transition } = pageTransition(reduceMotion);

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
        {/* relative + overflow-hidden vira o "palco": as páginas ficam absolutamente
            empilhadas dentro dele, então a troca é só opacidade/transform (compositing puro,
            sem recalcular layout de ninguém) — elimina qualquer engasgo na troca de rota. */}
        <main className="flex-1 relative overflow-hidden">
          <AnimatePresence initial={false}>
            <motion.div
              key={location.pathname}
              initial={initial}
              animate={animate}
              exit={exit}
              transition={transition}
              className="absolute inset-0 overflow-y-auto p-4 lg:p-8"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <FloatingAIButton />
    </div>
  );
}
