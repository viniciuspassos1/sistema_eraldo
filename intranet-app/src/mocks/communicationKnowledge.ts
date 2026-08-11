import type { AIAnswer } from './aiKnowledge';

// Base de respostas simuladas do assistente de Comunicação — foca em ajudar
// a organizar, esclarecer e tornar mais objetivos avisos, e-mails e respostas.
export const communicationAnswers: AIAnswer[] = [
  {
    keywords: ['mudança de horário', 'mudanca de horario', 'novo horário', 'novo horario'],
    resposta:
      'Sugestão de estrutura para o aviso:\n\n1) Assunto direto: "Atualização no horário de atendimento"\n2) O que mudou e a partir de quando\n3) Canal para dúvidas\n\nExemplo:\n"A partir de 01/09, o atendimento passa a funcionar das 08h às 17h. Dúvidas, fale com a recepção."',
    fonte: 'Manual Interno → Comunicação',
  },
  {
    keywords: ['adiamento', 'audiência adiada', 'audiencia adiada', 'remarcar'],
    resposta:
      'Modelo para comunicar um adiamento ao cliente:\n\n"Olá, [nome]. Informamos que sua audiência foi remarcada para [nova data/horário] por [motivo, se apropriado]. Seguimos à disposição para qualquer dúvida."\n\nDica: sempre confirme a nova data antes de enviar.',
    fonte: 'Manual Interno → Atendimento',
  },
  {
    keywords: ['reclamação', 'reclamacao', 'cliente insatisfeito', 'resposta educada'],
    resposta:
      'Estrutura sugerida para resposta a uma reclamação:\n\n1) Agradeça o contato e reconheça o problema\n2) Explique objetivamente o que está sendo feito\n3) Dê um prazo ou próximo passo claro\n\nEvite justificativas longas — objetividade transmite mais segurança.',
    fonte: 'Manual Interno → Atendimento',
  },
  {
    keywords: ['aviso', 'comunicado', 'como escrever'],
    resposta:
      'Todo aviso interno funciona melhor com essa estrutura:\n\nTítulo objetivo → O que muda → Quando passa a valer → Quem procurar em caso de dúvida.\n\nEvite parágrafos longos: prefira tópicos curtos.',
    fonte: 'Manual Interno → Comunicação',
  },
  {
    keywords: ['mais claro', 'mais objetivo', 'revisar texto', 'deixar mais claro'],
    resposta:
      'Para deixar um texto mais claro e objetivo:\n\n1) Uma ideia por frase\n2) Comece pela informação mais importante\n3) Corte advérbios e explicações desnecessárias\n4) Termine com a ação esperada do leitor (o que ele precisa fazer)\n\nCole o texto e eu ajudo a reorganizar.',
    fonte: 'Manual Interno → Comunicação',
  },
  {
    keywords: ['e-mail', 'email para cliente'],
    resposta:
      'Estrutura recomendada para e-mails a clientes:\n\nAssunto claro → Saudação → Contexto em 1 frase → Informação principal → Próximo passo → Assinatura.\n\nEvite mais de 3 parágrafos — se precisar de mais espaço, use tópicos.',
    fonte: 'Manual Interno → Comunicação',
  },
];

export const communicationFallback =
  'Ainda não tenho um modelo pronto para esse tipo de comunicação.\n\nMe dê mais contexto sobre a situação, ou consulte o Manual Interno → Comunicação para as diretrizes gerais.';
