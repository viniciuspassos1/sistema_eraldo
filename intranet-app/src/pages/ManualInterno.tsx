import { useState } from 'react';
import { BookText } from 'lucide-react';
import { Card } from '../components/Card';
import { cn } from '../utils/cn';

const capitulos = [
  { titulo: 'Apresentação', conteudo: 'O escritório Eraldo Júnior Advocacia atua há mais de 10 anos em direito previdenciário, com compromisso de dignidade, confiança e respeito aos clientes.' },
  { titulo: 'Cultura', conteudo: 'Valorizamos ética, colaboração e excelência técnica. Cada colaborador é incentivado a propor melhorias nos processos internos.' },
  { titulo: 'Horários', conteudo: 'Expediente de segunda a sexta, das 08h às 18h, com 1h de intervalo para almoço. Horários flexíveis mediante alinhamento com a gestão.' },
  { titulo: 'Conduta', conteudo: 'Espera-se postura profissional, sigilo sobre informações de clientes e respeito mútuo entre colegas de trabalho.' },
  { titulo: 'Atendimento', conteudo: 'O primeiro contato com o cliente deve ser respondido em até 24h úteis. Dúvidas processuais são direcionadas ao advogado responsável.' },
  { titulo: 'Sistemas', conteudo: 'Utilizamos PJe, e-SAJ e Meu INSS. Credenciais de acesso são pessoais e intransferíveis.' },
  { titulo: 'Segurança', conteudo: 'Não compartilhe senhas. Documentos sensíveis devem ser armazenados apenas nos repositórios autorizados pelo escritório.' },
  { titulo: 'Procedimentos', conteudo: 'Consulte a Base de Conhecimento para os procedimentos detalhados de cada área (jurídico, financeiro, administrativo).' },
  { titulo: 'Comunicação', conteudo: 'Avisos oficiais são publicados na aba Avisos. Solicitações internas devem ser abertas na Central de Solicitações.' },
  { titulo: 'Outros', conteudo: 'Dúvidas não cobertas neste manual podem ser encaminhadas ao setor de Recursos Humanos ou consultadas com o Assistente IA.' },
];

export function ManualInterno() {
  const [ativo, setAtivo] = useState(0);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <BookText className="w-5 h-5 text-gold" /> Manual Interno
        </h1>
        <p className="text-text-secondary text-sm mt-1">Guia de referência para colaboradores do escritório.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
          {capitulos.map((c, i) => (
            <button
              key={c.titulo}
              onClick={() => setAtivo(i)}
              className={cn(
                'text-left text-sm px-3 py-2 rounded-lg whitespace-nowrap lg:whitespace-normal shrink-0',
                ativo === i ? 'bg-navy text-white font-medium' : 'text-navy hover:bg-white'
              )}
            >
              {i + 1}. {c.titulo}
            </button>
          ))}
        </nav>

        <Card>
          <h2 className="text-lg font-semibold text-navy mb-3">{capitulos[ativo].titulo}</h2>
          <p className="text-sm text-navy leading-relaxed">{capitulos[ativo].conteudo}</p>
        </Card>
      </div>
    </div>
  );
}
