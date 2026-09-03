import type { IdeiaConteudo } from '../types';
import { getStoredToken } from '../utils/authToken';

const API_URL = import.meta.env.VITE_AUTHENTICATOR_API_URL as string | undefined;
const API_KEY = import.meta.env.VITE_AUTHENTICATOR_API_KEY as string | undefined;

export class CooperativaIdeiasApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL || !API_KEY) {
    throw new CooperativaIdeiasApiError('Backend não configurado. Veja intranet-app/.env.example.');
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
    throw new CooperativaIdeiasApiError(
      'Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)'
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new CooperativaIdeiasApiError(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }

  return response.json();
}

export function fetchIdeias(): Promise<IdeiaConteudo[]> {
  return request('/api/cooperativa-ideias');
}

export function createIdeia(input: {
  titulo: string;
  descricao: string;
  formato: string;
  tema: string;
  referencia?: string;
}): Promise<IdeiaConteudo> {
  return request('/api/cooperativa-ideias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updateIdeiaStatus(id: string, status: IdeiaConteudo['status']): Promise<IdeiaConteudo> {
  return request(`/api/cooperativa-ideias/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export function redigirIdeia(input: { titulo: string; formato: string; tema: string }): Promise<{ descricaoSugerida: string }> {
  return request('/api/cooperativa-ideias/redigir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
