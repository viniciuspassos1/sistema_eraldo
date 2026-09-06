import { apiRequest } from './client';

export interface CapituloManual {
  titulo: string;
  conteudo: string;
}

export class ManualInternoApiError extends Error {}

export function fetchManualInterno(): Promise<CapituloManual[]> {
  return apiRequest('/api/manual-interno', ManualInternoApiError);
}
