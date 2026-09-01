import type { Notification } from '../types';
import { getStoredToken } from '../utils/authToken';

const API_URL = import.meta.env.VITE_AUTHENTICATOR_API_URL as string | undefined;
const API_KEY = import.meta.env.VITE_AUTHENTICATOR_API_KEY as string | undefined;

export class NotificacoesApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL || !API_KEY) {
    throw new NotificacoesApiError('Backend não configurado. Veja intranet-app/.env.example.');
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
    throw new NotificacoesApiError(
      'Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)'
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new NotificacoesApiError(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }

  return response.json();
}

export function fetchNotificacoes(): Promise<Notification[]> {
  return request('/api/notificacoes');
}

export function marcarNotificacaoLida(id: string): Promise<Notification> {
  return request(`/api/notificacoes/${id}/lida`, { method: 'PATCH' });
}

export function marcarTodasLidas(): Promise<{ status: string }> {
  return request('/api/notificacoes/marcar-todas-lidas', { method: 'POST' });
}
