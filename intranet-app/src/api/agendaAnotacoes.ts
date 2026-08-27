import { getStoredToken } from '../utils/authToken';

export interface AnotacaoAgenda {
  id: string;
  data: string;
  horario: string;
  texto: string;
}

const API_URL = import.meta.env.VITE_AUTHENTICATOR_API_URL as string | undefined;
const API_KEY = import.meta.env.VITE_AUTHENTICATOR_API_KEY as string | undefined;

export class AgendaAnotacoesApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL || !API_KEY) {
    throw new AgendaAnotacoesApiError('Backend não configurado. Veja intranet-app/.env.example.');
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
    throw new AgendaAnotacoesApiError(
      'Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)'
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new AgendaAnotacoesApiError(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

export function fetchAnotacoes(): Promise<AnotacaoAgenda[]> {
  return request('/api/agenda/anotacoes');
}

export function criarAnotacao(data: string, horario: string, texto: string): Promise<AnotacaoAgenda> {
  return request('/api/agenda/anotacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, horario, texto }),
  });
}

export function atualizarAnotacao(id: string, texto: string): Promise<AnotacaoAgenda> {
  return request(`/api/agenda/anotacoes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto }),
  });
}

export function apagarAnotacao(id: string): Promise<void> {
  return request(`/api/agenda/anotacoes/${id}`, { method: 'DELETE' });
}
