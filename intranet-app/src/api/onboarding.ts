export interface ItemProgresso {
  itemId: string;
  item: string;
  ordem: number;
  concluido: boolean;
}

export interface ResumoFuncionario {
  funcionarioId: string;
  nome: string;
  cargo: string;
  percentual: number;
}

const API_URL = import.meta.env.VITE_AUTHENTICATOR_API_URL as string | undefined;
const API_KEY = import.meta.env.VITE_AUTHENTICATOR_API_KEY as string | undefined;

export class OnboardingApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL || !API_KEY) {
    throw new OnboardingApiError('Backend não configurado. Veja intranet-app/.env.example.');
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'X-API-Key': API_KEY, ...(init?.headers ?? {}) },
    });
  } catch {
    throw new OnboardingApiError(
      'Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)'
    );
  }

  if (response.status === 401) {
    throw new OnboardingApiError('Chave de API inválida — confira o .env do frontend e do backend.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new OnboardingApiError(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }

  return response.json();
}

export function fetchProgresso(email: string): Promise<ItemProgresso[]> {
  return request(`/api/onboarding/progresso?email=${encodeURIComponent(email)}`);
}

export function atualizarProgresso(email: string, itemId: string, concluido: boolean): Promise<ItemProgresso[]> {
  return request('/api/onboarding/progresso', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, itemId, concluido }),
  });
}

export function fetchResumoOnboarding(): Promise<ResumoFuncionario[]> {
  return request('/api/onboarding/resumo');
}
