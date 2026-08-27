import type { Announcement } from '../types';
import { getStoredToken } from '../utils/authToken';

const API_URL = import.meta.env.VITE_AUTHENTICATOR_API_URL as string | undefined;
const API_KEY = import.meta.env.VITE_AUTHENTICATOR_API_KEY as string | undefined;

export class AvisosApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL || !API_KEY) {
    throw new AvisosApiError('Backend não configurado. Veja intranet-app/.env.example.');
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
    throw new AvisosApiError(
      'Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)'
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new AvisosApiError(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

export function fetchAvisos(): Promise<Announcement[]> {
  return request('/api/avisos');
}

export function marcarAvisoLido(id: string): Promise<void> {
  return request(`/api/avisos/${id}/marcar-lido`, { method: 'POST' });
}
