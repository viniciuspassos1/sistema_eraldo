import type { DocumentItem } from '../types';
import { getStoredToken } from '../utils/authToken';

const API_URL = import.meta.env.VITE_AUTHENTICATOR_API_URL as string | undefined;
const API_KEY = import.meta.env.VITE_AUTHENTICATOR_API_KEY as string | undefined;

export class DocumentosApiError extends Error {}

export async function fetchDocumentos(): Promise<DocumentItem[]> {
  if (!API_URL || !API_KEY) {
    throw new DocumentosApiError('Backend não configurado. Veja intranet-app/.env.example.');
  }

  const token = getStoredToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/documentos`, {
      headers: { 'X-API-Key': API_KEY, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  } catch {
    throw new DocumentosApiError(
      'Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)'
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new DocumentosApiError(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }

  return response.json();
}
