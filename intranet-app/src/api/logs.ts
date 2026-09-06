import { getStoredToken } from '../utils/authToken';

export interface LogAuditoria {
  id: string;
  usuarioId: string | null;
  usuarioNome: string | null;
  acao: string;
  entidade: string | null;
  entidadeId: string | null;
  detalhes: Record<string, unknown> | null;
  criadoEm: string;
}

const API_URL = import.meta.env.VITE_AUTHENTICATOR_API_URL as string | undefined;
const API_KEY = import.meta.env.VITE_AUTHENTICATOR_API_KEY as string | undefined;

export class LogsApiError extends Error {}

export async function fetchLogs(filtro?: { usuarioId?: string; acao?: string }): Promise<LogAuditoria[]> {
  if (!API_URL || !API_KEY) {
    throw new LogsApiError('Backend não configurado. Veja intranet-app/.env.example.');
  }

  const params = new URLSearchParams();
  if (filtro?.usuarioId) params.set('usuarioId', filtro.usuarioId);
  if (filtro?.acao) params.set('acao', filtro.acao);
  const query = params.toString() ? `?${params.toString()}` : '';

  const token = getStoredToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/logs${query}`, {
      headers: { 'X-API-Key': API_KEY, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  } catch {
    throw new LogsApiError(
      'Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)'
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new LogsApiError(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }

  return response.json();
}
