import type { CourtLink } from '../types';
import { apiRequest } from './client';

export class TribunaisApiError extends Error {}

export function fetchTribunais(): Promise<CourtLink[]> {
  return apiRequest('/api/tribunais', TribunaisApiError);
}

export type TribunalInput = Omit<CourtLink, 'id'>;

export function criarTribunal(input: TribunalInput): Promise<CourtLink> {
  return apiRequest('/api/tribunais', TribunaisApiError, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function editarTribunal(id: string, input: TribunalInput): Promise<CourtLink> {
  return apiRequest(`/api/tribunais/${id}`, TribunaisApiError, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function excluirTribunal(id: string): Promise<void> {
  return apiRequest(`/api/tribunais/${id}`, TribunaisApiError, { method: 'DELETE' });
}
