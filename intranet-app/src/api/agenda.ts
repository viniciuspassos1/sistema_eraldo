import type { AgendaEvent } from '../types';
import { apiRequest } from './client';

export class AgendaApiError extends Error {}

export function fetchAgendaEventos(): Promise<AgendaEvent[]> {
  return apiRequest('/api/agenda/eventos', AgendaApiError);
}

export interface AgendaEventoInput {
  titulo: string;
  tipo: AgendaEvent['tipo'];
  data: string;
  horario: string;
  responsavelId?: string;
  local?: string;
  observacoes?: string;
}

export function criarAgendaEvento(input: AgendaEventoInput): Promise<AgendaEvent> {
  return apiRequest('/api/agenda/eventos', AgendaApiError, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function editarAgendaEvento(id: string, input: AgendaEventoInput): Promise<AgendaEvent> {
  return apiRequest(`/api/agenda/eventos/${id}`, AgendaApiError, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function excluirAgendaEvento(id: string): Promise<void> {
  return apiRequest(`/api/agenda/eventos/${id}`, AgendaApiError, { method: 'DELETE' });
}
