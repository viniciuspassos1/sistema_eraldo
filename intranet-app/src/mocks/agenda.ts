import type { Notification } from '../types';

// Ainda mockado: o sino de notificações do Header não usa a API real de
// notificações (backend/routers/notificacoes.py) — pendência separada,
// não fazia parte desta rodada de migração (Dashboard/Administração/Perfil).
export const notifications: Notification[] = [
  { id: 'n1', mensagem: 'Você possui uma audiência amanhã às 14h.', data: '2026-08-10', lida: false, tipo: 'AUDIENCIA' },
  { id: 'n2', mensagem: 'Suas férias começam em 7 dias.', data: '2026-08-09', lida: false, tipo: 'FERIAS' },
  { id: 'n3', mensagem: 'Novo comunicado publicado.', data: '2026-08-10', lida: false, tipo: 'AVISO' },
  { id: 'n4', mensagem: 'Hoje é aniversário de Fernanda Oliveira!', data: '2026-08-11', lida: false, tipo: 'ANIVERSARIO' },
  { id: 'n5', mensagem: 'Novo documento disponível: Manual de Atendimento.', data: '2026-08-04', lida: true, tipo: 'DOCUMENTO' },
];
