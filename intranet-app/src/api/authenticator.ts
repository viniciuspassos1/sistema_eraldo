export interface AuthenticatorService {
  id: string;
  name: string;
  code: string;
  periodSeconds: number;
  secondsRemaining: number;
}

interface CodesResponse {
  services: AuthenticatorService[];
  serverTime: number;
}

const API_URL = import.meta.env.VITE_AUTHENTICATOR_API_URL as string | undefined;
const API_KEY = import.meta.env.VITE_AUTHENTICATOR_API_KEY as string | undefined;

export class AuthenticatorApiError extends Error {}

export async function fetchAuthenticatorCodes(): Promise<AuthenticatorService[]> {
  if (!API_URL || !API_KEY) {
    throw new AuthenticatorApiError(
      'Backend do Authenticator não configurado. Veja intranet-app/.env.example.'
    );
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/authenticator/codes`, {
      headers: { 'X-API-Key': API_KEY },
    });
  } catch {
    throw new AuthenticatorApiError(
      'Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)'
    );
  }

  if (response.status === 401) {
    throw new AuthenticatorApiError('Chave de API inválida — confira o .env do frontend e do backend.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new AuthenticatorApiError(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }

  const data: CodesResponse = await response.json();
  return data.services;
}
