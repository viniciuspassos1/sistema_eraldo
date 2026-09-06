import type { DocumentItem } from '../types';
import { apiRequest } from './client';

export class DocumentosApiError extends Error {}

export function fetchDocumentos(): Promise<DocumentItem[]> {
  return apiRequest('/api/documentos', DocumentosApiError);
}
