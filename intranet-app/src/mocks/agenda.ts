import type { AgendaEvent, Holiday, Notification, Request } from '../types';

export const agendaEvents: AgendaEvent[] = [
  { id: 'e1', titulo: 'Audiência • Dr. João', tipo: 'AUDIENCIA', data: '2026-08-11', horario: '09:00', responsavel: 'Eraldo Júnior', local: 'TJBA - 3ª Vara' },
  { id: 'e2', titulo: 'Reunião comercial', tipo: 'REUNIAO', data: '2026-08-11', horario: '11:30', responsavel: 'Ana Beatriz Souza', local: 'Escritório' },
  { id: 'e3', titulo: 'Audiência • Dra. Maria', tipo: 'AUDIENCIA', data: '2026-08-11', horario: '14:00', responsavel: 'Mariana Costa', local: 'Videoconferência' },
  { id: 'e4', titulo: 'Reunião de equipe', tipo: 'REUNIAO', data: '2026-08-12', horario: '09:30', responsavel: 'Fernanda Oliveira', local: 'Sala de reuniões' },
];

export const holidays: Holiday[] = [
  { id: 'f1', nome: 'Independência do Brasil', dataInicio: '2026-09-07', tipo: 'FERIADO', escritorioFechado: true },
  { id: 'f2', nome: 'Nossa Senhora Aparecida', dataInicio: '2026-10-12', tipo: 'FERIADO', escritorioFechado: true },
  { id: 'f3', nome: 'Finados', dataInicio: '2026-11-02', tipo: 'FERIADO', escritorioFechado: true },
  { id: 'f4', nome: 'Recesso de fim de ano', dataInicio: '2026-12-21', dataFim: '2027-01-05', tipo: 'RECESSO', escritorioFechado: true, observacao: 'Retorno em 06/01' },
];

export const requests: Request[] = [
  { id: 'r1', numero: 'SOL-0091', solicitante: 'Rafael Andrade', categoria: 'Suporte técnico', descricao: 'Notebook não conecta ao Wi-Fi', responsavel: 'Carlos Eduardo Santos', data: '2026-08-10', status: 'EM_ANDAMENTO' },
  { id: 'r2', numero: 'SOL-0092', solicitante: 'João Pedro Lima', categoria: 'Solicitação de documento', descricao: 'Cópia de procuração assinada', responsavel: 'Ana Beatriz Souza', data: '2026-08-09', status: 'ABERTO' },
  { id: 'r3', numero: 'SOL-0090', solicitante: 'Patrícia Gomes', categoria: 'Solicitação de férias', descricao: 'Férias de 01/09 a 15/09', responsavel: 'Fernanda Oliveira', data: '2026-08-05', status: 'EM_ANALISE' },
  { id: 'r4', numero: 'SOL-0088', solicitante: 'Mariana Costa', categoria: 'Atualização de documentação', descricao: 'Atualizar modelo de petição previdenciária', responsavel: 'Eraldo Júnior', data: '2026-07-28', status: 'RESOLVIDO' },
];

export const notifications: Notification[] = [
  { id: 'n1', mensagem: 'Você possui uma audiência amanhã às 14h.', data: '2026-08-10', lida: false, tipo: 'AUDIENCIA' },
  { id: 'n2', mensagem: 'Suas férias começam em 7 dias.', data: '2026-08-09', lida: false, tipo: 'FERIAS' },
  { id: 'n3', mensagem: 'Novo comunicado publicado.', data: '2026-08-10', lida: false, tipo: 'AVISO' },
  { id: 'n4', mensagem: 'Hoje é aniversário de Fernanda Oliveira!', data: '2026-08-11', lida: false, tipo: 'ANIVERSARIO' },
  { id: 'n5', mensagem: 'Novo documento disponível: Manual de Atendimento.', data: '2026-08-04', lida: true, tipo: 'DOCUMENTO' },
];
