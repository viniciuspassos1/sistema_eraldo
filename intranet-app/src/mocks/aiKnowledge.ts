export interface AIAnswer {
  keywords: string[];
  resposta: string;
  fonte: string;
}

// Base de respostas simuladas do Agente de IA (fase mock).
// Em produção isso será substituído por busca semântica (RAG) real
// sobre férias, funcionários, audiências, agenda, avisos e base documental.
export const aiAnswers: AIAnswer[] = [
  {
    keywords: ['férias', 'ferias'],
    resposta:
      'Suas próximas férias estão programadas para 10/09/2026 a 20/09/2026.',
    fonte: 'Administração → Férias',
  },
  {
    keywords: ['audiência', 'audiencia', 'audiências', 'amanhã', 'amanha'],
    resposta:
      'Você tem 1 audiência amanhã (12/08/2026): Perícia Médica, processo 0809988-45.2025.8.05.0001, às 10:30, no INSS - Salvador.',
    fonte: 'Audiências',
  },
  {
    keywords: ['tjba', 'tribunal', 'link'],
    resposta: 'O link do TJBA é https://www.tjba.jus.br',
    fonte: 'Tribunais',
  },
  {
    keywords: ['quem está de férias', 'quem esta de ferias', 'férias este mês', 'ferias este mes'],
    resposta:
      'Neste mês está de férias: Ana Beatriz Souza (04/08 a 18/08/2026).',
    fonte: 'Administração → Férias',
  },
  {
    keywords: ['atendimento', 'documento sobre atendimento'],
    resposta:
      'O documento "Manual de Atendimento ao Cliente" trata desse tema. Ele descreve os prazos e o fluxo de resposta ao cliente.',
    fonte: 'Documentos → Comercial → Manual de Atendimento ao Cliente',
  },
  {
    keywords: ['procedimento', 'processo previdenciário', 'processo previdenciario'],
    resposta:
      'Para abrir um novo processo previdenciário: 1) cadastrar o cliente; 2) reunir documentação (CNIS, RG, comprovante de residência); 3) analisar o benefício cabível; 4) protocolar a petição em até 5 dias úteis.',
    fonte: 'Base de Conhecimento → Procedimento para abertura de novo processo previdenciário',
  },
  {
    keywords: ['aniversário', 'aniversario', 'aniversariante'],
    resposta: 'Hoje é aniversário de Fernanda Oliveira! 🎂',
    fonte: 'Aniversários',
  },
  {
    keywords: ['recesso', 'feriado'],
    resposta:
      'O recesso de fim de ano será de 21/12/2026 a 05/01/2027, com retorno em 06/01. O escritório funciona normalmente nos demais dias úteis.',
    fonte: 'Feriados e Recessos',
  },
];

export const fallbackAnswer =
  'Não encontrei essa informação na base de conhecimento.\n\nEntre em contato com o responsável pelo setor ou solicite a atualização da documentação.';
