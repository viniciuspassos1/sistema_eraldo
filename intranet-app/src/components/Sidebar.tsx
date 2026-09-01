import { useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { navItems } from './navItems';
import { useAuth } from '../context/AuthContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { cn } from '../utils/cn';
import logo from '../assets/logo-gold.webp';
import logoIcon from '../assets/logo-icon.png';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface HoveredTooltip {
  label: string;
  top: number;
  left: number;
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.perfil === 'ADMINISTRADOR';
  const reduceMotion = useReducedMotion();
  const [tooltip, setTooltip] = useState<HoveredTooltip | null>(null);

  const items = navItems.filter(
    (item) =>
      (!item.adminOnly || isAdmin) &&
      (!item.permissionKey || isAdmin || user?.permissoes?.[item.permissionKey] !== false)
  );

  function handleEnter(e: React.MouseEvent<HTMLElement>, label: string) {
    if (!collapsed || window.innerWidth < 1024) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2, left: rect.right + 12 });
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-navy/40 z-40 lg:hidden transition-opacity duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 h-screen bg-navy text-white flex flex-col z-50 transition-[width,transform] duration-200 ease-out',
          collapsed ? 'lg:w-[76px]' : 'lg:w-64',
          'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10 shrink-0">
          {collapsed ? (
            <img src={logoIcon} alt="Eraldo Júnior Advocacia" className="h-9 w-9 object-contain" />
          ) : (
            <img src={logo} alt="Eraldo Júnior Advocacia" className="h-12 w-auto max-w-[180px] object-contain" />
          )}
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-white/70 hover:text-white transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex text-white/50 hover:text-white transition-colors"
            aria-label="Recolher menu"
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {items.map((item) => {
            const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onCloseMobile}
                onMouseEnter={(e) => handleEnter(e, item.label)}
                onMouseLeave={() => setTooltip(null)}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm',
                  isActive ? 'text-white font-medium' : 'text-white/65 hover:text-white',
                  collapsed && 'lg:justify-center lg:px-2'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 rounded-lg bg-white/10"
                    transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.6 }}
                  />
                )}
                {!isActive && (
                  <span className="absolute inset-0 rounded-lg bg-white/0 hover:bg-white/5 transition-colors duration-150" />
                )}
                <item.icon className="relative w-[18px] h-[18px] shrink-0 transition-transform duration-150 group-hover:scale-110" strokeWidth={1.75} />
                {!collapsed && <span className="relative truncate">{item.label}</span>}
                {collapsed && <span className="relative lg:hidden truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 text-[11px] text-white/35">
          {!collapsed && <span>© {new Date().getFullYear()} Eraldo Júnior Advocacia</span>}
        </div>
      </aside>

      {createPortal(
        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, x: reduceMotion ? 0 : -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduceMotion ? 0 : -4 }}
              transition={{ duration: reduceMotion ? 0.08 : 0.15 }}
              style={{ position: 'fixed', top: tooltip.top, left: tooltip.left, transform: 'translateY(-50%)' }}
              className="whitespace-nowrap bg-navy text-white text-xs px-2.5 py-1.5 rounded-md shadow-soft-lg pointer-events-none z-[100]"
            >
              {tooltip.label}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
