import type { User } from '../types';
import { apiRequest } from './client';

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
  alergiaAlimentar: string | null;
}

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
    alergiaAlimentar: f.alergiaAlimentar ?? undefined,
  };
}

export async function fetchFuncionarios(): Promise<User[]> {
  const data = await apiRequest<FuncionarioResponse[]>('/api/funcionarios', FuncionariosApiError);
  return data.map(toUser);
}

export async function fetchFuncionario(id: string): Promise<User> {
  // O backend já responde 404 com {"detail": "Funcionário não encontrado."}
  // (ver backend/routers/funcionarios.py:obter_funcionario), então o apiRequest
  // genérico já propaga essa mensagem sem precisar de tratamento especial aqui.
  const data = await apiRequest<FuncionarioResponse>(`/api/funcionarios/${id}`, FuncionariosApiError);
  return toUser(data);
}

export async function atualizarMinhaAlergia(alergiaAlimentar: string): Promise<User> {
  const data = await apiRequest<FuncionarioResponse>('/api/funcionarios/minha-alergia', FuncionariosApiError, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alergiaAlimentar: alergiaAlimentar.trim() || null }),
  });
  return toUser(data);
}
