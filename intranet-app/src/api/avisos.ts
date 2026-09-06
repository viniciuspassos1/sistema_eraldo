import type { Announcement } from '../types';
import { apiRequest } from './client';

export class AvisosApiError extends Error {}

export function fetchAvisos(): Promise<Announcement[]> {
  return apiRequest('/api/avisos', AvisosApiError);
}

export function marcarAvisoLido(id: string): Promise<void> {
  return apiRequest(`/api/avisos/${id}/marcar-lido`, AvisosApiError, { method: 'POST' });
}

export interface AvisoInput {
  titulo: string;
  conteudo: string;
  prioridade: Announcement['prioridade'];
  publico: string;
}

export function criarAviso(input: AvisoInput): Promise<Announcement> {
  return apiRequest('/api/avisos', AvisosApiError, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function editarAviso(id: string, input: AvisoInput): Promise<Announcement> {
  return apiRequest(`/api/avisos/${id}`, AvisosApiError, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function excluirAviso(id: string): Promise<void> {
  return apiRequest(`/api/avisos/${id}`, AvisosApiError, { method: 'DELETE' });
}
