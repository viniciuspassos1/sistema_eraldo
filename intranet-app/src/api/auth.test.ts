import { describe, it, expect, vi, afterEach } from 'vitest';
import { login, me, AuthApiError } from './auth';

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    })
  );
}

describe('api/auth', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('login: devolve token e usuário quando o backend responde 200', async () => {
    mockFetchOnce(200, {
      token: 'jwt-de-teste',
      usuario: {
        id: '1',
        nome: 'Fulano',
        email: 'fulano@exemplo.com',
        cargo: 'Advogado',
        setor: 'Jurídico',
        fotoUrl: null,
        perfil: 'FUNCIONARIO',
        dataEntrada: '2024-01-01',
        aniversario: '1990-01-01',
        telefone: null,
        status: 'ATIVO',
        alergiaAlimentar: null,
        permissoes: {},
      },
    });

    const result = await login('fulano@exemplo.com', 'senha123', false);
    expect(result.token).toBe('jwt-de-teste');
    expect(result.usuario.nome).toBe('Fulano');
  });

  it('login: lança AuthApiError com a mensagem do backend quando as credenciais são inválidas', async () => {
    mockFetchOnce(401, { detail: 'E-mail ou senha inválidos.' });

    await expect(login('fulano@exemplo.com', 'errada', false)).rejects.toThrow(AuthApiError);
    await expect(login('fulano@exemplo.com', 'errada', false)).rejects.toThrow('E-mail ou senha inválidos.');
  });

  it('login: lança AuthApiError quando não consegue conectar ao backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network error'))
    );

    await expect(login('fulano@exemplo.com', 'senha123', false)).rejects.toThrow(AuthApiError);
  });

  it('me: propaga erro 401 (sessão expirada) como AuthApiError', async () => {
    mockFetchOnce(401, { detail: 'Sessão inválida ou expirada.' });

    await expect(me('token-expirado')).rejects.toThrow(AuthApiError);
  });
});
