import type { Vacation } from '../types';

export const vacations: Vacation[] = [
  {
    id: 'v1',
    funcionarioId: 'u4',
    funcionarioNome: 'Ana Beatriz Souza',
    inicio: '2026-08-04',
    fim: '2026-08-18',
    status: 'EM_ANDAMENTO',
  },
  {
    id: 'v2',
    funcionarioId: 'u1',
    funcionarioNome: 'Eraldo Júnior',
    inicio: '2026-09-10',
    fim: '2026-09-20',
    status: 'AGENDADA',
  },
  {
    id: 'v3',
    funcionarioId: 'u5',
    funcionarioNome: 'Carlos Eduardo Santos',
    inicio: '2026-09-01',
    fim: '2026-09-15',
    status: 'AGENDADA',
  },
  {
    id: 'v4',
    funcionarioId: 'u7',
    funcionarioNome: 'Rafael Andrade',
    inicio: '2026-07-01',
    fim: '2026-07-15',
    status: 'CONCLUIDA',
  },
];
