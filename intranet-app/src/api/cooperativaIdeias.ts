import type { IdeiaConteudo } from '../types';
import { apiRequest } from './client';

export class CooperativaIdeiasApiError extends Error {}

export function fetchIdeias(): Promise<IdeiaConteudo[]> {
  return apiRequest('/api/cooperativa-ideias', CooperativaIdeiasApiError);
}

export function createIdeia(input: {
  titulo: string;
  descricao: string;
  formato: string;
  tema: string;
  referencia?: string;
}): Promise<IdeiaConteudo> {
  return apiRequest('/api/cooperativa-ideias', CooperativaIdeiasApiError, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updateIdeiaStatus(id: string, status: IdeiaConteudo['status']): Promise<IdeiaConteudo> {
  return apiRequest(`/api/cooperativa-ideias/${id}`, CooperativaIdeiasApiError, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export function redigirIdeia(input: { titulo: string; formato: string; tema: string }): Promise<{ descricaoSugerida: string }> {
  return apiRequest('/api/cooperativa-ideias/redigir', CooperativaIdeiasApiError, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
