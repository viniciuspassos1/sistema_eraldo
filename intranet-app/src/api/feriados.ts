import type { Holiday } from '../types';
import { apiRequest } from './client';

export class FeriadosApiError extends Error {}

export function fetchFeriados(): Promise<Holiday[]> {
  return apiRequest('/api/feriados', FeriadosApiError);
}

export type FeriadoInput = Omit<Holiday, 'id'>;

export function criarFeriado(input: FeriadoInput): Promise<Holiday> {
  return apiRequest('/api/feriados', FeriadosApiError, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function editarFeriado(id: string, input: FeriadoInput): Promise<Holiday> {
  return apiRequest(`/api/feriados/${id}`, FeriadosApiError, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function excluirFeriado(id: string): Promise<void> {
  return apiRequest(`/api/feriados/${id}`, FeriadosApiError, { method: 'DELETE' });
}
