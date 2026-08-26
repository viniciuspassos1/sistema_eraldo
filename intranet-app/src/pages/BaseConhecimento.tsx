import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, ShieldAlert } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { fetchBaseConhecimento, BaseConhecimentoApiError } from '../api/baseConhecimento';
import type { KnowledgeArticle } from '../types';
import { formatDate } from '../utils/format';
import { useReducedMotion } from '../hooks/useReducedMotion';

const categorias = ['Procedimentos', 'FAQ', 'Sistemas', 'Atendimento', 'Jurídico', 'Administrativo', 'Comercial', 'Financeiro', 'Recursos Humanos', 'Tecnologia'];

export function BaseConhecimento() {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeArticle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoria, setCategoria] = useState('todas');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    fetchBaseConhecimento()
      .then(setKnowledgeBase)
      .catch((err) => setError(err instanceof BaseConhecimentoApiError ? err.message : 'Erro inesperado ao carregar a base de conhecimento.'));
  }, []);

  const filtrados = (knowledgeBase ?? []).filter((k) => {
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
          className="flex-1 bg-white border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
        />
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="bg-white border border-border rounded-lg px-3.5 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
        >
          <option value="todas">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <Card>
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar a base de conhecimento" description={error} />
        </Card>
      ) : knowledgeBase === null ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </Card>
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <Card>
          <EmptyState icon={BookOpen} title="Nenhum artigo encontrado" description="Tente outro termo ou categoria." />
        </Card>
      ) : (
        <div className="stagger-fade space-y-3">
          {filtrados.map((k) => (
            <div key={k.id}>
              <Card interactive onClick={() => setAberto(aberto === k.id ? null : k.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-navy">{k.titulo}</p>
                      <Badge tone="navy">{k.categoria}</Badge>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                      {k.autor} · atualizado em {formatDate(k.atualizadoEm)}
                    </p>
                    <AnimatePresence initial={false}>
                      {aberto === k.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          <p className="text-sm text-navy mt-3 leading-relaxed">{k.conteudo}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
