import { getStoredToken } from '../utils/authToken';

export interface Pendencia {
  tipo: 'ONBOARDING' | 'SOLICITACAO' | 'ATESTADO' | 'IDEIA' | 'ANOTACAO';
  mensagem: string;
  link: string;
}

const API_URL = import.meta.env.VITE_AUTHENTICATOR_API_URL as string | undefined;
const API_KEY = import.meta.env.VITE_AUTHENTICATOR_API_KEY as string | undefined;

export class PendenciasApiError extends Error {}

export async function fetchPendencias(): Promise<Pendencia[]> {
  if (!API_URL || !API_KEY) {
    throw new PendenciasApiError('Backend não configurado. Veja intranet-app/.env.example.');
  }

  const token = getStoredToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/pendencias`, {
      headers: {
        'X-API-Key': API_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new PendenciasApiError(
      'Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)'
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new PendenciasApiError(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }

  return response.json();
}
