/* Cliente HTTP compartilhado por todos os módulos em src/api/*.ts — evita
 * reimplementar em cada arquivo a mesma lógica de headers (X-API-Key +
 * token de sessão), tratamento de erro de rede e parse de erro do backend.
 *
 * Existia antes um "request<T>" quase idêntico copiado em ~15 arquivos, e
 * mais alguns com fetch inline duplicado. Essa duplicação já causou bugs
 * reais e repetidos: um módulo esquecer de anexar o header Authorization
 * (ver commits "Corrige clients do frontend que nao mandavam o token de
 * sessao" e "Corrige fetchAgendaEventos: nao mandava o token de sessao").
 * Centralizar aqui elimina essa classe de bug — só existe um lugar que
 * monta os headers da requisição. */

import { getStoredToken } from '../utils/authToken';

export const API_URL = import.meta.env.VITE_AUTHENTICATOR_API_URL as string | undefined;
export const API_KEY = import.meta.env.VITE_AUTHENTICATOR_API_KEY as string | undefined;

export function backendConfigurado(): boolean {
  return Boolean(API_URL && API_KEY);
}

type ErroApiConstructor = new (message: string) => Error;

/** Monta a URL final e os headers padrão (X-API-Key + Authorization, se
 * houver token salvo), faz o fetch e só trata falha de rede — quem chama
 * decide o que fazer com o status da resposta (ver apiRequest abaixo para
 * o caso comum de "virar JSON ou lançar erro"). */
export async function apiFetch(
  path: string,
  ErroApi: ErroApiConstructor,
  init?: RequestInit
): Promise<Response> {
  if (!API_URL || !API_KEY) {
    throw new ErroApi('Backend não configurado. Veja intranet-app/.env.example.');
  }

  const token = getStoredToken();
  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'X-API-Key': API_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ErroApi(
      'Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)'
    );
  }
}

/** Caso comum: chama apiFetch, lança ErroApi com a mensagem do backend se a
 * resposta não for OK, e devolve o corpo já parseado (undefined em 204). */
export async function apiRequest<T>(
  path: string,
  ErroApi: ErroApiConstructor,
  init?: RequestInit
): Promise<T> {
  const response = await apiFetch(path, ErroApi, init);

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ErroApi(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}
