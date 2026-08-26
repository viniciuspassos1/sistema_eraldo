import type { Request } from '../types';

const API_URL = import.meta.env.VITE_AUTHENTICATOR_API_URL as string | undefined;
const API_KEY = import.meta.env.VITE_AUTHENTICATOR_API_KEY as string | undefined;

export class SolicitacoesApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL || !API_KEY) {
    throw new SolicitacoesApiError('Backend não configurado. Veja intranet-app/.env.example.');
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'X-API-Key': API_KEY, ...(init?.headers ?? {}) },
    });
  } catch {
    throw new SolicitacoesApiError(
      'Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)'
    );
  }

  if (response.status === 401) {
    throw new SolicitacoesApiError('Chave de API inválida — confira o .env do frontend e do backend.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new SolicitacoesApiError(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }

  return response.json();
}

export function fetchSolicitacoes(): Promise<Request[]> {
  return request('/api/solicitacoes');
}

export function createSolicitacao(input: {
  categoria: string;
  descricao: string;
  solicitanteEmail: string;
}): Promise<Request> {
  return request('/api/solicitacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
