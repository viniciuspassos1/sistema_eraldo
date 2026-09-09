import type { Colaborador } from '../types';
import { apiRequest } from './client';

export class ColaboradoresApiError extends Error {}

export function fetchColaboradores(): Promise<Colaborador[]> {
  return apiRequest('/api/colaboradores', ColaboradoresApiError);
}

export interface ColaboradorInput {
  nome: string;
  nomeCompleto?: string | null;
  aniversario: string;
  restricaoAlimentar?: string | null;
  papel: Colaborador['papel'];
}

export function criarColaborador(input: ColaboradorInput): Promise<Colaborador> {
  return apiRequest('/api/colaboradores', ColaboradoresApiError, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function editarColaborador(id: string, input: ColaboradorInput): Promise<Colaborador> {
  return apiRequest(`/api/colaboradores/${id}`, ColaboradoresApiError, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function excluirColaborador(id: string): Promise<void> {
  return apiRequest(`/api/colaboradores/${id}`, ColaboradoresApiError, { method: 'DELETE' });
}
