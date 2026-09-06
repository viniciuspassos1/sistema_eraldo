import type { NotaPessoal } from '../types';
import { apiRequest } from './client';

export class NotasPessoaisApiError extends Error {}

export function fetchNotas(): Promise<NotaPessoal[]> {
  return apiRequest('/api/notas-pessoais', NotasPessoaisApiError);
}

export function criarNota(titulo: string, conteudo: string): Promise<NotaPessoal> {
  return apiRequest('/api/notas-pessoais', NotasPessoaisApiError, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titulo, conteudo }),
  });
}

export function atualizarNota(id: string, titulo: string, conteudo: string): Promise<NotaPessoal> {
  return apiRequest(`/api/notas-pessoais/${id}`, NotasPessoaisApiError, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titulo, conteudo }),
  });
}

export function apagarNota(id: string): Promise<void> {
  return apiRequest(`/api/notas-pessoais/${id}`, NotasPessoaisApiError, { method: 'DELETE' });
}

export function alternarConcluida(id: string, concluida: boolean): Promise<NotaPessoal> {
  return apiRequest(`/api/notas-pessoais/${id}/concluida`, NotasPessoaisApiError, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ concluida }),
  });
}
