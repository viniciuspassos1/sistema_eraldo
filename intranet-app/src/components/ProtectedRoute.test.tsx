import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import * as AuthContext from '../context/AuthContext';
import type { User } from '../types';

function mockUseAuth(user: User | null, loading = false) {
  vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
    user,
    loading,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  });
}

const usuarioBase: User = {
  id: '1',
  nome: 'Fulano',
  email: 'fulano@exemplo.com',
  cargo: 'Advogado',
  setor: 'Jurídico',
  perfil: 'FUNCIONARIO',
  dataEntrada: '2024-01-01',
  aniversario: '1990-01-01',
  status: 'ATIVO',
  permissoes: { 'assistente-ia': false },
};

function renderProtegida(props: { adminOnly?: boolean; pagina?: string }) {
  return render(
    <MemoryRouter initialEntries={['/protegida']}>
      <Routes>
        <Route path="/login" element={<div>Tela de login</div>} />
        <Route path="/" element={<div>Dashboard</div>} />
        <Route
          path="/protegida"
          element={
            <ProtectedRoute {...props}>
              <div>Conteúdo protegido</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('redireciona para /login quando não há usuário logado', () => {
    mockUseAuth(null);
    renderProtegida({});
    expect(screen.getByText('Tela de login')).toBeInTheDocument();
  });

  it('mostra o conteúdo quando o usuário está logado e não há restrição', () => {
    mockUseAuth(usuarioBase);
    renderProtegida({});
    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument();
  });

  it('redireciona pro Dashboard quando adminOnly e o usuário não é administrador', () => {
    mockUseAuth(usuarioBase);
    renderProtegida({ adminOnly: true });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('libera adminOnly quando o usuário é administrador', () => {
    mockUseAuth({ ...usuarioBase, perfil: 'ADMINISTRADOR' });
    renderProtegida({ adminOnly: true });
    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument();
  });

  it('redireciona quando a permissão da página está explicitamente desativada', () => {
    mockUseAuth(usuarioBase);
    renderProtegida({ pagina: 'assistente-ia' });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('libera a página quando a permissão não está desativada', () => {
    mockUseAuth(usuarioBase);
    renderProtegida({ pagina: 'documentos' });
    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument();
  });

  it('administrador sempre acessa, mesmo com a permissão desativada na lista', () => {
    mockUseAuth({ ...usuarioBase, perfil: 'ADMINISTRADOR', permissoes: { 'assistente-ia': false } });
    renderProtegida({ pagina: 'assistente-ia' });
    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument();
  });
});
