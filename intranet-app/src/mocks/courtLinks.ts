import type { CourtLink } from '../types';

export const courtLinks: CourtLink[] = [
  { id: 'c1', nome: 'TJBA', descricao: 'Tribunal de Justiça da Bahia', url: 'https://www.tjba.jus.br', categoria: 'Estadual' },
  { id: 'c2', nome: 'TJRS', descricao: 'Tribunal de Justiça do Rio Grande do Sul', url: 'https://www.tjrs.jus.br', categoria: 'Estadual' },
  { id: 'c3', nome: 'TRF-1', descricao: 'Tribunal Regional Federal da 1ª Região', url: 'https://portal.trf1.jus.br', categoria: 'Federal' },
  { id: 'c4', nome: 'TRF-3', descricao: 'Tribunal Regional Federal da 3ª Região', url: 'https://www.trf3.jus.br', categoria: 'Federal' },
  { id: 'c5', nome: 'TRF-5', descricao: 'Tribunal Regional Federal da 5ª Região', url: 'https://www.trf5.jus.br', categoria: 'Federal' },
  { id: 'c6', nome: 'TST', descricao: 'Tribunal Superior do Trabalho', url: 'https://www.tst.jus.br', categoria: 'Trabalhista' },
  { id: 'c7', nome: 'TRT-5', descricao: 'Tribunal Regional do Trabalho da 5ª Região', url: 'https://www.trt5.jus.br', categoria: 'Trabalhista' },
  { id: 'c8', nome: 'STJ', descricao: 'Superior Tribunal de Justiça', url: 'https://www.stj.jus.br', categoria: 'Superior' },
  { id: 'c9', nome: 'STF', descricao: 'Supremo Tribunal Federal', url: 'https://www.stf.jus.br', categoria: 'Superior' },
  { id: 'c10', nome: 'INSS - Meu INSS', descricao: 'Portal de serviços previdenciários', url: 'https://meu.inss.gov.br', categoria: 'Sistemas Externos' },
  { id: 'c11', nome: 'PJe', descricao: 'Processo Judicial Eletrônico', url: 'https://pje.jus.br', categoria: 'Sistemas Externos' },
  { id: 'c12', nome: 'e-SAJ', descricao: 'Sistema de Automação da Justiça', url: 'https://esaj.tjba.jus.br', categoria: 'Sistemas Externos' },
];
