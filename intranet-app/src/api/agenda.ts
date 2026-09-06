import type { AgendaEvent } from '../types';
import { apiRequest } from './client';

export class AgendaApiError extends Error {}

export function fetchAgendaEventos(): Promise<AgendaEvent[]> {
  return apiRequest('/api/agenda/eventos', AgendaApiError);
}
