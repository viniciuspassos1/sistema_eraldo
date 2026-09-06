import type { Notification } from '../types';
import { apiRequest } from './client';

export class NotificacoesApiError extends Error {}

export function fetchNotificacoes(): Promise<Notification[]> {
  return apiRequest('/api/notificacoes', NotificacoesApiError);
}

export function marcarNotificacaoLida(id: string): Promise<Notification> {
  return apiRequest(`/api/notificacoes/${id}/lida`, NotificacoesApiError, { method: 'PATCH' });
}

export function marcarTodasLidas(): Promise<{ status: string }> {
  return apiRequest('/api/notificacoes/marcar-todas-lidas', NotificacoesApiError, { method: 'POST' });
}
