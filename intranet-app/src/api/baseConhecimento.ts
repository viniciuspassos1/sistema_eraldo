import type { KnowledgeArticle } from '../types';
import { apiRequest } from './client';

export class BaseConhecimentoApiError extends Error {}

export function fetchBaseConhecimento(): Promise<KnowledgeArticle[]> {
  return apiRequest('/api/base-conhecimento', BaseConhecimentoApiError);
}

export interface ArtigoInput {
  titulo: string;
  categoria: string;
  conteudo: string;
  status: KnowledgeArticle['status'];
  tags: string[];
}

export function criarArtigo(input: ArtigoInput): Promise<KnowledgeArticle> {
  return apiRequest('/api/base-conhecimento', BaseConhecimentoApiError, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function editarArtigo(id: string, input: ArtigoInput): Promise<KnowledgeArticle> {
  return apiRequest(`/api/base-conhecimento/${id}`, BaseConhecimentoApiError, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function excluirArtigo(id: string): Promise<void> {
  return apiRequest(`/api/base-conhecimento/${id}`, BaseConhecimentoApiError, { method: 'DELETE' });
}
