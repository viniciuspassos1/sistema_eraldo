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

export function atualizarSolicitacao(
  id: string,
  input: { status?: Request['status']; responsavelId?: string }
): Promise<Request> {
  return apiRequest(`/api/solicitacoes/${id}`, SolicitacoesApiError, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
