import type { Announcement } from '../types';

export const announcements: Announcement[] = [
  {
    id: 'a1',
    titulo: 'Recesso de fim de ano atualizado',
    conteudo: 'O período de recesso deste ano foi ajustado para 21/12 a 05/01. Consulte o calendário de feriados para mais detalhes.',
    autor: 'Fernanda Oliveira',
    data: '2026-08-10',
    prioridade: 'ADMINISTRATIVO',
    publico: 'Todos',
    lido: false,
  },
  {
    id: 'a2',
    titulo: 'Novo funcionário: Rafael Andrade',
    conteudo: 'Demos boas-vindas ao Rafael Andrade, novo estagiário do setor Previdenciário.',
    autor: 'Fernanda Oliveira',
    data: '2026-08-06',
    prioridade: 'INFORMATIVO',
    publico: 'Todos',
    lido: true,
  },
  {
    id: 'a3',
    titulo: 'Manual interno atualizado',
    conteudo: 'O capítulo de Atendimento ao Cliente foi revisado. Recomendamos a leitura de todos os colaboradores.',
    autor: 'Eraldo Júnior',
    data: '2026-08-04',
    prioridade: 'JURIDICO',
    publico: 'Jurídico',
    lido: false,
  },
  {
    id: 'a4',
    titulo: 'Manutenção programada no sistema',
    conteudo: 'Na madrugada de sábado o sistema ficará indisponível das 00h às 03h para manutenção.',
    autor: 'Carlos Eduardo Santos',
    data: '2026-08-01',
    prioridade: 'TECNOLOGIA',
    publico: 'Todos',
    lido: true,
  },
];
