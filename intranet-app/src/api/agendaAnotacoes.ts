import { apiRequest } from './client';

export interface AnotacaoAgenda {
  id: string;
  data: string;
  horario: string;
  titulo: string;
  tipo: 'AUDIENCIA' | 'REUNIAO' | 'COMPROMISSO' | 'EVENTO' | 'OUTRO';
  local?: string;
  texto?: string;
}

export interface DadosAnotacao {
  titulo: string;
  tipo: AnotacaoAgenda['tipo'];
  local?: string;
  texto?: string;
}

export class AgendaAnotacoesApiError extends Error {}

export function fetchAnotacoes(): Promise<AnotacaoAgenda[]> {
  return apiRequest('/api/agenda/anotacoes', AgendaAnotacoesApiError);
}

export function criarAnotacao(data: string, horario: string, dados: DadosAnotacao): Promise<AnotacaoAgenda> {
  return apiRequest('/api/agenda/anotacoes', AgendaAnotacoesApiError, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, horario, ...dados }),
  });
}

export function atualizarAnotacao(id: string, dados: DadosAnotacao): Promise<AnotacaoAgenda> {
  return apiRequest(`/api/agenda/anotacoes/${id}`, AgendaAnotacoesApiError, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
}

export function apagarAnotacao(id: string): Promise<void> {
  return apiRequest(`/api/agenda/anotacoes/${id}`, AgendaAnotacoesApiError, { method: 'DELETE' });
}
