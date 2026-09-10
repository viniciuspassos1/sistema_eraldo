import type { Notification } from '../types';
import { apiRequest } from './client';

export class NotificacoesApiError extends Error {}

export function fetchNotificacoes(): Promise<Notification[]> {
  return apiRequest('/api/notificacoes', NotificacoesApiError);
}

export function marcarNotificacaoVista(id: string): Promise<Notification> {
  return apiRequest(`/api/notificacoes/${id}/vista`, NotificacoesApiError, { method: 'PATCH' });
}

export function marcarNotificacaoConfirmada(id: string): Promise<Notification> {
  return apiRequest(`/api/notificacoes/${id}/confirmar`, NotificacoesApiError, { method: 'PATCH' });
}

export function marcarTodasVistas(): Promise<{ status: string }> {
  return apiRequest('/api/notificacoes/marcar-todas-vistas', NotificacoesApiError, { method: 'POST' });
}

export interface AlertaAgendaInput {
  origemTipo: 'AGENDA_EVENTO' | 'AGENDA_ANOTACAO';
  origemId: string;
  mensagem: string;
}

export interface AlertaAgendaResultado extends Notification {
  /** false = o alerta já existia (evento já tinha gerado notificação antes)
   * — o chamador não deve tocar som nem abrir o painel de novo. */
  criado: boolean;
}

export function criarAlertaAgenda(input: AlertaAgendaInput): Promise<AlertaAgendaResultado> {
  return apiRequest('/api/notificacoes/alerta-agenda', NotificacoesApiError, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
