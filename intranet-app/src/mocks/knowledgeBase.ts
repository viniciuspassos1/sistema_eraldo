import type { KnowledgeArticle } from '../types';

export const knowledgeBase: KnowledgeArticle[] = [
  {
    id: 'k1',
    titulo: 'Procedimento para abertura de novo processo previdenciário',
    categoria: 'Jurídico',
    conteudo:
      'Ao receber um novo caso previdenciário, o advogado responsável deve: 1) Cadastrar o cliente no sistema; 2) Reunir documentação (CNIS, RG, comprovante de residência); 3) Analisar o tipo de benefício cabível; 4) Protocolar a petição inicial no prazo de até 5 dias úteis após a reunião com o cliente.',
    autor: 'Eraldo Júnior',
    criadoEm: '2025-04-10',
    atualizadoEm: '2026-06-01',
    status: 'PUBLICADO',
    tags: ['previdenciário', 'procedimento', 'processo'],
  },
  {
    id: 'k2',
    titulo: 'Como funciona o atendimento ao cliente',
    categoria: 'Atendimento',
    conteudo:
      'O primeiro contato deve ser respondido em até 24h úteis. Toda dúvida sobre andamento processual deve ser repassada ao advogado responsável pelo caso. Reclamações devem ser registradas na Central de Solicitações.',
    autor: 'Ana Beatriz Souza',
    criadoEm: '2025-05-12',
    atualizadoEm: '2026-08-04',
    status: 'PUBLICADO',
    tags: ['atendimento', 'cliente'],
  },
  {
    id: 'k3',
    titulo: 'FAQ - Sistemas utilizados pelo escritório',
    categoria: 'Sistemas',
    conteudo:
      'O escritório utiliza PJe para processos federais e trabalhistas, e-SAJ para processos estaduais na Bahia, e Meu INSS para consultas de benefícios. Credenciais de acesso são de responsabilidade individual e não devem ser compartilhadas.',
    autor: 'Carlos Eduardo Santos',
    criadoEm: '2025-09-18',
    atualizadoEm: '2026-04-10',
    status: 'PUBLICADO',
    tags: ['sistemas', 'faq', 'ti'],
  },
  {
    id: 'k4',
    titulo: 'Política de férias e escala',
    categoria: 'Recursos Humanos',
    conteudo:
      'As férias devem ser solicitadas com no mínimo 30 dias de antecedência através da Central de Solicitações. O RH confirma a escala considerando a cobertura mínima do setor.',
    autor: 'Fernanda Oliveira',
    criadoEm: '2025-03-01',
    atualizadoEm: '2026-02-15',
    status: 'PUBLICADO',
    tags: ['rh', 'férias'],
  },
  {
    id: 'k5',
    titulo: 'Procedimento financeiro - reembolso de despesas',
    categoria: 'Financeiro',
    conteudo:
      'Despesas de deslocamento para audiências e diligências devem ser lançadas na planilha de reembolso e enviadas ao setor financeiro até o dia 25 de cada mês, com nota fiscal ou recibo anexado.',
    autor: 'Carlos Eduardo Santos',
    criadoEm: '2025-11-20',
    atualizadoEm: '2026-01-15',
    status: 'PUBLICADO',
    tags: ['financeiro', 'reembolso'],
  },
];
