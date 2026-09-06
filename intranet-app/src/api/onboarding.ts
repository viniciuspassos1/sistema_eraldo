import { apiRequest } from './client';

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

export class OnboardingApiError extends Error {}

export function fetchProgresso(): Promise<ItemProgresso[]> {
  return apiRequest('/api/onboarding/progresso', OnboardingApiError);
}

export function atualizarProgresso(itemId: string, concluido: boolean): Promise<ItemProgresso[]> {
  return apiRequest('/api/onboarding/progresso', OnboardingApiError, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId, concluido }),
  });
}

export function fetchResumoOnboarding(): Promise<ResumoFuncionario[]> {
  return apiRequest('/api/onboarding/resumo', OnboardingApiError);
}
