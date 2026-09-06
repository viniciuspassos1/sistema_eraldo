import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Login } from './Login';
import { AuthProvider } from '../context/AuthContext';

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Login', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renderiza os campos obrigatórios do formulário', () => {
    renderLogin();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('exige e-mail e senha antes de permitir o envio', () => {
    renderLogin();
    const email = screen.getByLabelText(/e-mail/i) as HTMLInputElement;
    const senha = screen.getByLabelText(/^senha$/i) as HTMLInputElement;
    expect(email).toBeRequired();
    expect(senha).toBeRequired();
  });
});
