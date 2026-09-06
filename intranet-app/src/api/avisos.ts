import type { Announcement } from '../types';
import { apiRequest } from './client';

export class AvisosApiError extends Error {}

export function fetchAvisos(): Promise<Announcement[]> {
  return apiRequest('/api/avisos', AvisosApiError);
}

export function marcarAvisoLido(id: string): Promise<void> {
  return apiRequest(`/api/avisos/${id}/marcar-lido`, AvisosApiError, { method: 'POST' });
}
