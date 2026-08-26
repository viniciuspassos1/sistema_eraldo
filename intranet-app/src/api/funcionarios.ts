import type { User } from '../types';

interface FuncionarioResponse {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  setor: string;
  fotoUrl: string | null;
  perfil: User['perfil'];
  dataEntrada: string;
  aniversario: string;
  telefone: string | null;
  status: User['status'];
}

const API_URL = import.meta.env.VITE_AUTHENTICATOR_API_URL as string | undefined;
const API_KEY = import.meta.env.VITE_AUTHENTICATOR_API_KEY as string | undefined;

export class FuncionariosApiError extends Error {}

function toUser(f: FuncionarioResponse): User {
  return {
    id: f.id,
    nome: f.nome,
    email: f.email,
    cargo: f.cargo,
    setor: f.setor,
    foto: f.fotoUrl ?? undefined,
    perfil: f.perfil,
    dataEntrada: f.dataEntrada,
    aniversario: f.aniversario,
    telefone: f.telefone ?? undefined,
    status: f.status,
  };
}

async function request<T>(path: string): Promise<T> {
  if (!API_URL || !API_KEY) {
    throw new FuncionariosApiError('Backend não configurado. Veja intranet-app/.env.example.');
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { 'X-API-Key': API_KEY },
    });
  } catch {
    throw new FuncionariosApiError(
      'Não foi possível conectar ao backend local. Ele está rodando? (uvicorn main:app --port 8010)'
    );
  }

  if (response.status === 401) {
    throw new FuncionariosApiError('Chave de API inválida — confira o .env do frontend e do backend.');
  }
  if (response.status === 404) {
    throw new FuncionariosApiError('Funcionário não encontrado.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new FuncionariosApiError(body?.detail ?? `Erro do servidor (HTTP ${response.status}).`);
  }

  return response.json();
}

export async function fetchFuncionarios(): Promise<User[]> {
  const data = await request<FuncionarioResponse[]>('/api/funcionarios');
  return data.map(toUser);
}

export async function fetchFuncionario(id: string): Promise<User> {
  const data = await request<FuncionarioResponse>(`/api/funcionarios/${id}`);
  return toUser(data);
}
