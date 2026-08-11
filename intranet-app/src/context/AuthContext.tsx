import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { employees, TEST_CREDENTIAL } from '../mocks/employees';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<{ ok: boolean; erro?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const SESSION_KEY = 'intranet_ej_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const found = employees.find((e) => e.id === stored);
      if (found) setUser(found);
    }
    setLoading(false);
  }, []);

  const login: AuthContextValue['login'] = async (email, senha) => {
    // Autenticação mockada — em produção isso vira uma chamada de API
    // com hash de senha e sessão/JWT emitidos pelo backend.
    await new Promise((r) => setTimeout(r, 350));

    const emailNormalizado = email.trim().toLowerCase();
    if (emailNormalizado === TEST_CREDENTIAL.email && senha === TEST_CREDENTIAL.senha) {
      const admin = employees.find((e) => e.email === TEST_CREDENTIAL.email)!;
      sessionStorage.setItem(SESSION_KEY, admin.id);
      setUser(admin);
      return { ok: true };
    }

    return { ok: false, erro: 'E-mail ou senha inválidos.' };
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
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
