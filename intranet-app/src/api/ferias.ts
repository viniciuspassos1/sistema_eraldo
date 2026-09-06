import type { Vacation } from '../types';
import { apiRequest } from './client';

export class FeriasApiError extends Error {}

export function fetchFerias(): Promise<Vacation[]> {
  return apiRequest('/api/ferias', FeriasApiError);
}

export interface FeriasInput {
  funcionarioId: string;
  inicio: string;
  fim: string;
  status: Vacation['status'];
  observacoes?: string;
}

export function criarFerias(input: FeriasInput): Promise<Vacation> {
  return apiRequest('/api/ferias', FeriasApiError, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function editarFerias(id: string, input: FeriasInput): Promise<Vacation> {
  return apiRequest(`/api/ferias/${id}`, FeriasApiError, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function excluirFerias(id: string): Promise<void> {
  return apiRequest(`/api/ferias/${id}`, FeriasApiError, { method: 'DELETE' });
}
