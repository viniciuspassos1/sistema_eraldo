import type { User } from '../types';
import { getStoredToken } from '../utils/authToken';

interface UsuarioResponse {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  setor: string;
  fotoUrl: string | null;
  perfil: User['perfil'];
  dataEntrada: string;
  aniversario: string;
  telefone: string | null;
  status: User['status'];
}

interface LoginResponse {
  token: string;
  usuario: UsuarioResponse;
}

const API_URL = import.meta.env.VITE_AUTHENTICATOR_API_URL as string | undefined;
const API_KEY = import.meta.env.VITE_AUTHENTICATOR_API_KEY as string | undefined;

export class AuthApiError extends Error {}

function toUser(u: UsuarioResponse): User {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    cargo: u.cargo,
    setor: u.setor,
    foto: u.fotoUrl ?? undefined,
    perfil: u.perfil,
    dataEntrada: u.dataEntrada,
    aniversario: u.aniversario,
    telefone: u.telefone ?? undefined,
    status: u.status,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL || !API_KEY) {
    throw new AuthApiError('Backend não configurado. Veja intranet-app/.env.example.');
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'X-API-Key': API_KEY, ...(init?.headers ?? {}) },
    });
  } catch {
    throw new AuthApiError(
      'Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)'
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new AuthApiError(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

export async function login(
  email: string,
  senha: string,
  manterConectado: boolean
): Promise<{ token: string; usuario: User }> {
  const data = await request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha, manterConectado }),
  });
  return { token: data.token, usuario: toUser(data.usuario) };
}

export async function me(token: string): Promise<User> {
  const data = await request<UsuarioResponse>('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return toUser(data);
}

export async function trocarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
  const token = getStoredToken();
  await request<void>('/api/auth/trocar-senha', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ senhaAtual, novaSenha }),
  });
}
