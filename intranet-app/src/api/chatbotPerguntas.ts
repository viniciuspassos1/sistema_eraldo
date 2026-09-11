import type { PerguntaChatbot, PerguntaComResposta } from '../types';
import { apiRequest } from './client';

export class ChatbotApiError extends Error {}

export function fetchPerguntas(): Promise<PerguntaChatbot[]> {
  return apiRequest('/api/chatbot/perguntas', ChatbotApiError);
}

export function fetchPerguntaComResposta(id: string): Promise<PerguntaComResposta> {
  return apiRequest(`/api/chatbot/perguntas/${id}`, ChatbotApiError);
}

export interface PerguntaInput {
  pergunta: string;
  categoria: string;
  documentoId: string;
  ordem: number;
  ativo: boolean;
}

export function criarPergunta(input: PerguntaInput): Promise<PerguntaChatbot> {
  return apiRequest('/api/chatbot/perguntas', ChatbotApiError, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function editarPergunta(id: string, input: PerguntaInput): Promise<PerguntaChatbot> {
  return apiRequest(`/api/chatbot/perguntas/${id}`, ChatbotApiError, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function excluirPergunta(id: string): Promise<void> {
  return apiRequest(`/api/chatbot/perguntas/${id}`, ChatbotApiError, { method: 'DELETE' });
}
