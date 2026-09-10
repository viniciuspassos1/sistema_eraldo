import { apiRequest } from './client';

export interface LogAuditoria {
  id: string;
  usuarioId: string | null;
  usuarioNome: string | null;
  acao: string;
  entidade: string | null;
  entidadeId: string | null;
  detalhes: Record<string, unknown> | null;
  status: 'SUCESSO' | 'ERRO';
  criadoEm: string;
}

export class LogsApiError extends Error {}

export interface FiltroLogs {
  usuarioId?: string;
  acao?: string;
  status?: 'SUCESSO' | 'ERRO';
  documento?: string;
  dataInicio?: string;
  dataFim?: string;
}

export function fetchLogs(filtro?: FiltroLogs): Promise<LogAuditoria[]> {
  const params = new URLSearchParams();
  if (filtro?.usuarioId) params.set('usuarioId', filtro.usuarioId);
  if (filtro?.acao) params.set('acao', filtro.acao);
  if (filtro?.status) params.set('status', filtro.status);
  if (filtro?.documento) params.set('documento', filtro.documento);
  if (filtro?.dataInicio) params.set('dataInicio', filtro.dataInicio);
  if (filtro?.dataFim) params.set('dataFim', filtro.dataFim);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/api/logs${query}`, LogsApiError);
}
