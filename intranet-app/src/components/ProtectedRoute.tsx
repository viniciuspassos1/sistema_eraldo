import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROTA_PRIMEIRO_ACESSO = '/primeiro-acesso';

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
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-cream">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Conta ainda com a senha padrão (definida pelo admin na criação, nunca
  // trocada): bloqueia QUALQUER outra página interna até a troca acontecer
  // em /primeiro-acesso, não importa qual rota a pessoa tente abrir.
  if (user.trocaSenhaObrigatoria && location.pathname !== ROTA_PRIMEIRO_ACESSO) {
    return <Navigate to={ROTA_PRIMEIRO_ACESSO} replace />;
  }
  // E o inverso: já trocou a senha (ou nunca precisou), não tem motivo pra
  // ficar na tela de primeiro acesso — manda pro Dashboard.
  if (!user.trocaSenhaObrigatoria && location.pathname === ROTA_PRIMEIRO_ACESSO) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && user.perfil !== 'ADMINISTRADOR') return <Navigate to="/" replace />;
  if (pagina && user.perfil !== 'ADMINISTRADOR' && user.permissoes?.[pagina] === false) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
