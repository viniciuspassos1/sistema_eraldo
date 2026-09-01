import { getStoredToken } from '../utils/authToken';

export interface AssistantFonte {
  documento: string;
  secao: string;
}

export interface AssistantAnswer {
  resposta: string;
  fontes: AssistantFonte[];
  encontrado: boolean;
}

interface AskResponse {
  resposta: string;
  fontes: AssistantFonte[];
  encontrado: boolean;
}

// Mesmo backend/porta/chave do Meu Authenticator — um serviço Python só.
const API_URL = import.meta.env.VITE_AUTHENTICATOR_API_URL as string | undefined;
const API_KEY = import.meta.env.VITE_AUTHENTICATOR_API_KEY as string | undefined;

export class AssistantApiError extends Error {}

export async function askAssistant(pergunta: string): Promise<AssistantAnswer> {
  if (!API_URL || !API_KEY) {
    throw new AssistantApiError(
      'Backend do Assistente não configurado. Veja intranet-app/.env.example.'
    );
  }

  const token = getStoredToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/assistant/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ pergunta }),
    });
  } catch {
    throw new AssistantApiError(
      'Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)'
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new AssistantApiError(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }

  const data: AskResponse = await response.json();
  return data;
}
