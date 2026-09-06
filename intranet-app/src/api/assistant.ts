import { apiRequest } from './client';

export interface AssistantFonte {
  documento: string;
  secao: string;
}

export interface AssistantAnswer {
  resposta: string;
  fontes: AssistantFonte[];
  encontrado: boolean;
}

export class AssistantApiError extends Error {}

export function askAssistant(pergunta: string): Promise<AssistantAnswer> {
  return apiRequest('/api/assistant/ask', AssistantApiError, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pergunta }),
  });
}

export async function askComunicacao(pergunta: string): Promise<string> {
  const data = await apiRequest<{ resposta: string }>('/api/assistant/comunicacao', AssistantApiError, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pergunta }),
  });
  return data.resposta;
}
