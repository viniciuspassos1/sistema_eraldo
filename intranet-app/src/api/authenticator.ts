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
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export class AuthenticatorApiError extends Error {}

const DEMO_PERIOD = 30;

// Modo apresentação: nenhum backend real por trás, só ilustra o funcionamento
// (código rotativo, contador). Nunca usado fora de builds de demonstração —
// controlado por VITE_DEMO_MODE, que fica desligado no build normal do app.
function fetchDemoCodes(): AuthenticatorService[] {
  const now = Math.floor(Date.now() / 1000);
  const window = Math.floor(now / DEMO_PERIOD);
  const code = String(((window * 999331) % 1000000)).padStart(6, '0');
  const secondsRemaining = DEMO_PERIOD - (now % DEMO_PERIOD);

  return [
    {
      id: 'demo-1',
      name: 'Sistema Jurídico (exemplo)',
      code,
      periodSeconds: DEMO_PERIOD,
      secondsRemaining,
    },
  ];
}

export async function fetchAuthenticatorCodes(): Promise<AuthenticatorService[]> {
  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 350));
    return fetchDemoCodes();
  }

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
