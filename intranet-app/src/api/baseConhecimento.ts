import type { KnowledgeArticle } from '../types';

const API_URL = import.meta.env.VITE_AUTHENTICATOR_API_URL as string | undefined;
const API_KEY = import.meta.env.VITE_AUTHENTICATOR_API_KEY as string | undefined;

export class BaseConhecimentoApiError extends Error {}

export async function fetchBaseConhecimento(): Promise<KnowledgeArticle[]> {
  if (!API_URL || !API_KEY) {
    throw new BaseConhecimentoApiError('Backend não configurado. Veja intranet-app/.env.example.');
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/base-conhecimento`, {
      headers: { 'X-API-Key': API_KEY },
    });
  } catch {
    throw new BaseConhecimentoApiError(
      'Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)'
    );
  }

  if (response.status === 401) {
    throw new BaseConhecimentoApiError('Chave de API inválida — confira o .env do frontend e do backend.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new BaseConhecimentoApiError(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }

  return response.json();
}
