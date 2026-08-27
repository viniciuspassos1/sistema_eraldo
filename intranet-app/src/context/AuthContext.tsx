import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { login as apiLogin, me as apiMe, AuthApiError } from '../api/auth';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, senha: string, manterConectado?: boolean) => Promise<{ ok: boolean; erro?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const TOKEN_KEY = 'intranet_ej_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiMe(token)
      .then(setUser)
      .catch(clearStoredToken)
      .finally(() => setLoading(false));
  }, []);

  const login: AuthContextValue['login'] = async (email, senha, manterConectado = false) => {
    try {
      const { token, usuario } = await apiLogin(email.trim().toLowerCase(), senha, manterConectado);
      (manterConectado ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
      setUser(usuario);
      return { ok: true };
    } catch (err) {
      return { ok: false, erro: err instanceof AuthApiError ? err.message : 'Não foi possível entrar.' };
    }
  };

  const logout = () => {
    clearStoredToken();
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
