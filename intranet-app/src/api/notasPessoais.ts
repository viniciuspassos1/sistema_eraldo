import type { NotaPessoal } from '../types';
import { getStoredToken } from '../utils/authToken';

const API_URL = import.meta.env.VITE_AUTHENTICATOR_API_URL as string | undefined;
const API_KEY = import.meta.env.VITE_AUTHENTICATOR_API_KEY as string | undefined;

export class NotasPessoaisApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL || !API_KEY) {
    throw new NotasPessoaisApiError('Backend não configurado. Veja intranet-app/.env.example.');
  }

  const token = getStoredToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'X-API-Key': API_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new NotasPessoaisApiError(
      'Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)'
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new NotasPessoaisApiError(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

export function fetchNotas(): Promise<NotaPessoal[]> {
  return request('/api/notas-pessoais');
}

export function criarNota(titulo: string, conteudo: string): Promise<NotaPessoal> {
  return request('/api/notas-pessoais', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titulo, conteudo }),
  });
}

export function atualizarNota(id: string, titulo: string, conteudo: string): Promise<NotaPessoal> {
  return request(`/api/notas-pessoais/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titulo, conteudo }),
  });
}

export function apagarNota(id: string): Promise<void> {
  return request(`/api/notas-pessoais/${id}`, { method: 'DELETE' });
}

export function alternarConcluida(id: string, concluida: boolean): Promise<NotaPessoal> {
  return request(`/api/notas-pessoais/${id}/concluida`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ concluida }),
  });
}
