export type UserRole = 'ADMINISTRADOR' | 'GESTOR' | 'FUNCIONARIO';

export interface User {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  setor: string;
  foto?: string;
  perfil: UserRole;
  dataEntrada: string;
  aniversario: string;
  telefone?: string;
  status: 'ATIVO' | 'INATIVO' | 'FERIAS';
}

export interface Hearing {
  id: string;
  processo: string;
  cliente: string;
  advogado: string;
  data: string;
  horario: string;
  tipo: string;
  local: string;
  observacoes?: string;
  status: 'AGENDADA' | 'REALIZADA' | 'CANCELADA' | 'REMARCADA';
}

export interface Vacation {
  id: string;
  funcionarioId: string;
  funcionarioNome: string;
  inicio: string;
  fim: string;
  status: 'AGENDADA' | 'EM_ANDAMENTO' | 'CONCLUIDA';
  observacoes?: string;
}

export interface Announcement {
  id: string;
  titulo: string;
  conteudo: string;
  autor: string;
  data: string;
  prioridade: 'INFORMATIVO' | 'URGENTE' | 'ADMINISTRATIVO' | 'JURIDICO' | 'TECNOLOGIA';
  publico: string;
  lido: boolean;
}

export interface DocumentItem {
  id: string;
  titulo: string;
  categoria: string;
  autor: string;
  data: string;
  atualizadoEm: string;
  tags: string[];
  status: 'PUBLICADO' | 'RASCUNHO';
  tamanho: string;
}

export interface KnowledgeArticle {
  id: string;
  titulo: string;
  categoria: string;
  conteudo: string;
  autor: string;
  criadoEm: string;
  atualizadoEm: string;
  status: 'PUBLICADO' | 'RASCUNHO';
  tags: string[];
}

export interface CourtLink {
  id: string;
  nome: string;
  descricao: string;
  url: string;
  categoria: string;
}

export interface AgendaEvent {
  id: string;
  titulo: string;
  tipo: 'AUDIENCIA' | 'REUNIAO' | 'COMPROMISSO' | 'EVENTO' | 'OUTRO';
  data: string;
  horario: string;
  responsavel: string;
  local?: string;
  observacoes?: string;
}

export interface Holiday {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim?: string;
  tipo: 'FERIADO' | 'RECESSO';
  escritorioFechado: boolean;
  observacao?: string;
}

export interface Request {
  id: string;
  numero: string;
  solicitante: string;
  categoria: string;
  descricao: string;
  responsavel?: string;
  data: string;
  status: 'ABERTO' | 'EM_ANALISE' | 'EM_ANDAMENTO' | 'RESOLVIDO' | 'CANCELADO';
}

export interface Notification {
  id: string;
  mensagem: string;
  data: string;
  lida: boolean;
  tipo: 'AUDIENCIA' | 'FERIAS' | 'AVISO' | 'ANIVERSARIO' | 'DOCUMENTO' | 'SOLICITACAO';
}

export interface IdeiaConteudo {
  id: string;
  titulo: string;
  descricao: string;
  formato: string;
  tema: string;
  referencia?: string;
  autor: string;
  data: string;
  status: 'NOVA' | 'EM_ANALISE' | 'APROVADA' | 'EM_PRODUCAO' | 'PUBLICADA' | 'NAO_APROVADA';
}

export interface ChatMessage {
  id: string;
  autor: 'usuario' | 'ia';
  texto: string;
  fonte?: string;
  data: string;
}
