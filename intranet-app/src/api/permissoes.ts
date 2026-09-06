import { apiRequest } from './client';

export interface PermissaoPagina {
  pagina: string;
  permitido: boolean;
}

export interface PaginaPermissao {
  chave: string;
  label: string;
}

export class PermissoesApiError extends Error {}

// Fonte única de verdade é o backend (security.PAGINAS_PERMISSAO) — evita
// manter uma segunda lista de páginas aqui que pode ficar desatualizada.
export function fetchPaginasPermissao(): Promise<PaginaPermissao[]> {
  return apiRequest('/api/permissoes/paginas', PermissoesApiError);
}

export function fetchTodasPermissoes(): Promise<Record<string, Record<string, boolean>>> {
  return apiRequest('/api/permissoes', PermissoesApiError);
}

export function fetchPermissoes(usuarioId: string): Promise<PermissaoPagina[]> {
  return apiRequest(`/api/permissoes/${usuarioId}`, PermissoesApiError);
}

export function salvarPermissoes(usuarioId: string, permissoes: PermissaoPagina[]): Promise<PermissaoPagina[]> {
  return apiRequest(`/api/permissoes/${usuarioId}`, PermissoesApiError, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(permissoes),
  });
}
