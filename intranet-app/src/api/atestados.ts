import type { Atestado, AtestadoAdmin } from '../types';
import { getStoredToken } from '../utils/authToken';

const API_URL = import.meta.env.VITE_AUTHENTICATOR_API_URL as string | undefined;
const API_KEY = import.meta.env.VITE_AUTHENTICATOR_API_KEY as string | undefined;

export class AtestadosApiError extends Error {}

function checarConfig() {
  if (!API_URL || !API_KEY) {
    throw new AtestadosApiError('Backend não configurado. Veja intranet-app/.env.example.');
  }
}

async function tratarResposta<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new AtestadosApiError(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return {
    'X-API-Key': API_KEY as string,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchMeusAtestados(): Promise<Atestado[]> {
  checarConfig();
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/atestados`, { headers: authHeaders() });
  } catch {
    throw new AtestadosApiError('Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)');
  }
  return tratarResposta(response);
}

export async function fetchTodosAtestados(): Promise<AtestadoAdmin[]> {
  checarConfig();
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/atestados/todos`, { headers: authHeaders() });
  } catch {
    throw new AtestadosApiError('Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)');
  }
  return tratarResposta(response);
}

export async function criarAtestado(input: {
  dataInicio: string;
  dataFim: string;
  motivo?: string;
  arquivo: File;
}): Promise<Atestado> {
  checarConfig();
  const form = new FormData();
  form.set('dataInicio', input.dataInicio);
  form.set('dataFim', input.dataFim);
  if (input.motivo) form.set('motivo', input.motivo);
  form.set('arquivo', input.arquivo);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/atestados`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    });
  } catch {
    throw new AtestadosApiError('Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)');
  }
  return tratarResposta(response);
}

export async function atualizarStatusAtestado(
  id: string,
  status: 'APROVADO' | 'RECUSADO',
  observacoesRh?: string
): Promise<AtestadoAdmin> {
  checarConfig();
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/atestados/${id}/status`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, observacoesRh }),
    });
  } catch {
    throw new AtestadosApiError('Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)');
  }
  return tratarResposta(response);
}

export async function baixarArquivoAtestado(id: string, nomeArquivo: string): Promise<void> {
  checarConfig();
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/atestados/${id}/arquivo`, { headers: authHeaders() });
  } catch {
    throw new AtestadosApiError('Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new AtestadosApiError(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
