import type { Atestado, AtestadoAdmin } from '../types';
import { apiFetch, apiRequest } from './client';

export class AtestadosApiError extends Error {}

export function fetchMeusAtestados(): Promise<Atestado[]> {
  return apiRequest('/api/atestados', AtestadosApiError);
}

export function fetchTodosAtestados(): Promise<AtestadoAdmin[]> {
  return apiRequest('/api/atestados/todos', AtestadosApiError);
}

export function criarAtestado(input: {
  dataInicio: string;
  dataFim: string;
  motivo?: string;
  arquivo: File;
}): Promise<Atestado> {
  const form = new FormData();
  form.set('dataInicio', input.dataInicio);
  form.set('dataFim', input.dataFim);
  if (input.motivo) form.set('motivo', input.motivo);
  form.set('arquivo', input.arquivo);

  return apiRequest('/api/atestados', AtestadosApiError, { method: 'POST', body: form });
}

export function atualizarStatusAtestado(
  id: string,
  status: 'APROVADO' | 'RECUSADO',
  observacoesRh?: string
): Promise<AtestadoAdmin> {
  return apiRequest(`/api/atestados/${id}/status`, AtestadosApiError, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, observacoesRh }),
  });
}

export async function baixarArquivoAtestado(id: string, nomeArquivo: string): Promise<void> {
  const response = await apiFetch(`/api/atestados/${id}/arquivo`, AtestadosApiError);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new AtestadosApiError(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
