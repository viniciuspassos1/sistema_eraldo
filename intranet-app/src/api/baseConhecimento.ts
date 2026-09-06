import type { KnowledgeArticle } from '../types';
import { apiRequest } from './client';

export class BaseConhecimentoApiError extends Error {}

export function fetchBaseConhecimento(): Promise<KnowledgeArticle[]> {
  return apiRequest('/api/base-conhecimento', BaseConhecimentoApiError);
}
