import { NavLink } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { navItems } from './navItems';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'ADMINISTRADOR';

  const items = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-navy/40 z-40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 h-screen bg-navy text-white flex flex-col z-50 transition-all duration-200',
          collapsed ? 'lg:w-[76px]' : 'lg:w-64',
          'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10 shrink-0">
          {!collapsed && (
            <div className="leading-tight">
              <p className="text-[13px] font-semibold tracking-wide">ERALDO JÚNIOR</p>
              <p className="text-[10px] text-gold tracking-widest">ADVOCACIA</p>
            </div>
          )}
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-white/70 hover:text-white"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex text-white/50 hover:text-white"
            aria-label="Recolher menu"
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-white/65 hover:text-white hover:bg-white/5',
                  collapsed && 'lg:justify-center lg:px-2'
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {collapsed && <span className="lg:hidden truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 text-[11px] text-white/35">
          {!collapsed && <span>© {new Date().getFullYear()} Eraldo Júnior Advocacia</span>}
        </div>
      </aside>
    </>
  );
}
