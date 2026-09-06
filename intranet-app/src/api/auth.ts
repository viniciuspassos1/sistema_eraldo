import type { User } from '../types';
import { apiRequest } from './client';

interface UsuarioResponse {
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
  permissoes: Record<string, boolean>;
}

interface LoginResponse {
  token: string;
  usuario: UsuarioResponse;
}

export class AuthApiError extends Error {}

function toUser(u: UsuarioResponse): User {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    cargo: u.cargo,
    setor: u.setor,
    foto: u.fotoUrl ?? undefined,
    perfil: u.perfil,
    dataEntrada: u.dataEntrada,
    aniversario: u.aniversario,
    telefone: u.telefone ?? undefined,
    status: u.status,
    alergiaAlimentar: u.alergiaAlimentar ?? undefined,
    permissoes: u.permissoes,
  };
}

export async function login(
  email: string,
  senha: string,
  manterConectado: boolean
): Promise<{ token: string; usuario: User }> {
  const data = await apiRequest<LoginResponse>('/api/auth/login', AuthApiError, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha, manterConectado }),
  });
  return { token: data.token, usuario: toUser(data.usuario) };
}

// Recebe o token explicitamente (em vez de ler do storage) porque é chamado
// logo após o login, com o token que acabou de vir na resposta — pode ainda
// não ter sido salvo no storage nesse momento.
export async function me(token: string): Promise<User> {
  const data = await apiRequest<UsuarioResponse>('/api/auth/me', AuthApiError, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return toUser(data);
}

export async function trocarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
  await apiRequest<void>('/api/auth/trocar-senha', AuthApiError, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senhaAtual, novaSenha }),
  });
}
