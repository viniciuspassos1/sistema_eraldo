import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({
  children,
  adminOnly = false,
  pagina,
}: {
  children: ReactNode;
  adminOnly?: boolean;
  /** Chave de user.permissoes — se a página estiver desmarcada pro usuário, redireciona. */
  pagina?: string;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-cream">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.perfil !== 'ADMINISTRADOR') return <Navigate to="/" replace />;
  if (pagina && user.perfil !== 'ADMINISTRADOR' && user.permissoes?.[pagina] === false) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
