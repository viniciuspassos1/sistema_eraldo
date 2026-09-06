import { apiRequest } from './client';

export interface Pendencia {
  tipo: 'ONBOARDING' | 'SOLICITACAO' | 'ATESTADO' | 'IDEIA' | 'ANOTACAO';
  mensagem: string;
  link: string;
}

export class PendenciasApiError extends Error {}

export function fetchPendencias(): Promise<Pendencia[]> {
  return apiRequest('/api/pendencias', PendenciasApiError);
}
