import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { knowledgeBase } from '../mocks/knowledgeBase';
import { formatDate } from '../utils/format';

const categorias = ['Procedimentos', 'FAQ', 'Sistemas', 'Atendimento', 'Jurídico', 'Administrativo', 'Comercial', 'Financeiro', 'Recursos Humanos', 'Tecnologia'];

export function BaseConhecimento() {
  const [categoria, setCategoria] = useState('todas');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<string | null>(null);

  const filtrados = knowledgeBase.filter((k) => {
    if (categoria !== 'todas' && k.categoria !== categoria) return false;
    if (busca && !`${k.titulo} ${k.tags.join(' ')}`.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-gold" /> Base de Conhecimento
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Biblioteca interna consultada pelo Assistente IA para responder perguntas.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar artigos..."
          className="flex-1 bg-white border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="bg-white border border-border rounded-lg px-3.5 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
        >
          <option value="todas">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {filtrados.length === 0 ? (
        <Card>
          <EmptyState icon={BookOpen} title="Nenhum artigo encontrado" description="Tente outro termo ou categoria." />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtrados.map((k) => (
            <Card key={k.id} interactive onClick={() => setAberto(aberto === k.id ? null : k.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-navy">{k.titulo}</p>
                    <Badge tone="navy">{k.categoria}</Badge>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {k.autor} · atualizado em {formatDate(k.atualizadoEm)}
                  </p>
                  {aberto === k.id && <p className="text-sm text-navy mt-3 leading-relaxed">{k.conteudo}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
