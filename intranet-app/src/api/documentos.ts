import type { DocumentItem } from '../types';
import { apiRequest, apiFetch, API_URL } from './client';

export class DocumentosApiError extends Error {}

export function fetchDocumentos(): Promise<DocumentItem[]> {
  return apiRequest('/api/documentos', DocumentosApiError);
}

export interface NovoDocumentoInput {
  titulo: string;
  categoria: string;
  tags?: string[];
  status?: DocumentItem['status'];
  arquivo: File;
}

export async function uploadDocumento(input: NovoDocumentoInput): Promise<DocumentItem> {
  const form = new FormData();
  form.set('titulo', input.titulo);
  form.set('categoria', input.categoria);
  form.set('tags', (input.tags ?? []).join(','));
  form.set('status', input.status ?? 'RASCUNHO');
  form.set('arquivo', input.arquivo);

  const response = await apiFetch('/api/documentos', DocumentosApiError, { method: 'POST', body: form });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new DocumentosApiError(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }
  return response.json();
}

export function excluirDocumento(id: string): Promise<void> {
  return apiRequest(`/api/documentos/${id}`, DocumentosApiError, { method: 'DELETE' });
}

export function urlDownloadDocumento(id: string): string {
  return `${API_URL}/api/documentos/${id}/arquivo`;
}

export async function baixarDocumento(id: string): Promise<Blob> {
  const response = await apiFetch(`/api/documentos/${id}/arquivo`, DocumentosApiError);
  if (!response.ok) {
    throw new DocumentosApiError('Não foi possível baixar o arquivo.');
  }
  return response.blob();
}
