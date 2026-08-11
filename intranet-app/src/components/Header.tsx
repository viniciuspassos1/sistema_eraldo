import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, ChevronDown, User, LogOut, Settings } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { Avatar } from './Avatar';
import { useAuth } from '../context/AuthContext';
import { notifications as mockNotifications } from '../mocks/agenda';

export function Header({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unread = mockNotifications.filter((n) => !n.lida).length;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  return (
    <header className="h-16 shrink-0 bg-white border-b border-border flex items-center gap-4 px-4 lg:px-6 sticky top-0 z-30">
      <button onClick={onOpenMobileMenu} className="lg:hidden text-navy" aria-label="Abrir menu">
        <Menu className="w-5 h-5" />
      </button>

      <SearchBar />

      <div className="ml-auto flex items-center gap-2">
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-cream text-navy"
            aria-label="Notificações"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gold" />
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-border rounded-xl shadow-soft-lg py-2 z-50">
              <div className="px-4 py-2 text-xs font-semibold text-navy border-b border-border">
                Notificações
              </div>
              <div className="max-h-72 overflow-y-auto">
                {mockNotifications.map((n) => (
                  <div key={n.id} className="px-4 py-2.5 hover:bg-cream flex gap-2 items-start">
                    {!n.lida && <span className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 shrink-0" />}
                    <p className={`text-xs ${n.lida ? 'text-text-secondary' : 'text-navy'}`}>{n.mensagem}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setNotifOpen(false);
                  navigate('/notificacoes');
                }}
                className="w-full text-center text-xs text-gold font-medium py-2 border-t border-border hover:bg-cream"
              >
                Ver todas
              </button>
            </div>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-cream"
          >
            <Avatar nome={user.nome} size="sm" />
            <span className="hidden md:block text-sm font-medium text-navy">{user.nome.split(' ')[0]}</span>
            <ChevronDown className="w-3.5 h-3.5 text-text-secondary hidden md:block" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-border rounded-xl shadow-soft-lg py-1.5 z-50">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/perfil');
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-navy hover:bg-cream"
              >
                <User className="w-4 h-4" /> Meu perfil
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/notificacoes');
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-navy hover:bg-cream"
              >
                <Bell className="w-4 h-4" /> Notificações
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/configuracoes');
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-navy hover:bg-cream"
              >
                <Settings className="w-4 h-4" /> Configurações
              </button>
              <div className="border-t border-border my-1.5" />
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
