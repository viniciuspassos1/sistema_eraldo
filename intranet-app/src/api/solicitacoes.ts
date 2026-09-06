import type { Request } from '../types';
import { apiRequest } from './client';

export class SolicitacoesApiError extends Error {}

export function fetchSolicitacoes(): Promise<Request[]> {
  return apiRequest('/api/solicitacoes', SolicitacoesApiError);
}

export function createSolicitacao(input: { categoria: string; descricao: string }): Promise<Request> {
  return apiRequest('/api/solicitacoes', SolicitacoesApiError, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
