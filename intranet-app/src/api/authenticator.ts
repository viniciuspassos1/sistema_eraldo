import { apiRequest } from './client';

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

  const data = await apiRequest<CodesResponse>('/api/authenticator/codes', AuthenticatorApiError);
  return data.services;
}
