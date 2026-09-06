import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, ShieldAlert, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import {
  fetchBaseConhecimento,
  criarArtigo,
  editarArtigo,
  excluirArtigo,
  BaseConhecimentoApiError,
} from '../api/baseConhecimento';
import type { KnowledgeArticle } from '../types';
import { formatDate } from '../utils/format';
import { useReducedMotion } from '../hooks/useReducedMotion';

const categorias = ['Procedimentos', 'FAQ', 'Sistemas', 'Atendimento', 'Jurídico', 'Administrativo', 'Comercial', 'Financeiro', 'Recursos Humanos', 'Tecnologia'];
const FORM_VAZIO = { titulo: '', categoria: categorias[0], conteudo: '', status: 'RASCUNHO' as KnowledgeArticle['status'], tags: '' };

export function BaseConhecimento() {
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'ADMINISTRADOR';
  const { showToast } = useToast();
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeArticle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoria, setCategoria] = useState('todas');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState<'idle' | 'loading'>('idle');

  function carregar() {
    return fetchBaseConhecimento()
      .then(setKnowledgeBase)
      .catch((err) => setError(err instanceof BaseConhecimentoApiError ? err.message : 'Erro inesperado ao carregar a base de conhecimento.'));
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(k: KnowledgeArticle, ev: React.MouseEvent) {
    ev.stopPropagation();
    setEditandoId(k.id);
    setForm({ titulo: k.titulo, categoria: k.categoria, conteudo: k.conteudo, status: k.status, tags: k.tags.join(', ') });
    setModalAberto(true);
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setSalvando('loading');
    const payload = {
      titulo: form.titulo,
      categoria: form.categoria,
      conteudo: form.conteudo,
      status: form.status,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    try {
      if (editandoId) {
        await editarArtigo(editandoId, payload);
        showToast('Artigo atualizado.');
      } else {
        await criarArtigo(payload);
        showToast('Artigo publicado.');
      }
      setModalAberto(false);
      await carregar();
    } catch (err) {
      showToast(err instanceof BaseConhecimentoApiError ? err.message : 'Erro ao salvar artigo.', 'error');
    } finally {
      setSalvando('idle');
    }
  }

  async function excluir(id: string, ev: React.MouseEvent) {
    ev.stopPropagation();
    if (!window.confirm('Excluir este artigo?')) return;
    try {
      await excluirArtigo(id);
      showToast('Artigo excluído.');
      await carregar();
    } catch (err) {
      showToast(err instanceof BaseConhecimentoApiError ? err.message : 'Erro ao excluir artigo.', 'error');
    }
  }

  const filtrados = (knowledgeBase ?? []).filter((k) => {
    if (categoria !== 'todas' && k.categoria !== categoria) return false;
    if (busca && !`${k.titulo} ${k.tags.join(' ')}`.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gold" /> Base de Conhecimento
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Biblioteca interna consultada pelo Assistente IA para responder perguntas.
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={abrirNovo}>
            <Plus className="w-4 h-4" /> Novo artigo
          </Button>
        )}
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
                      {k.status === 'RASCUNHO' && <Badge tone="neutral">Rascunho</Badge>}
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
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(ev) => abrirEdicao(k, ev)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-cream hover:text-navy transition-colors"
                        aria-label="Editar artigo"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(ev) => excluir(k.id, ev)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        aria-label="Excluir artigo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        title={editandoId ? 'Editar artigo' : 'Novo artigo'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button status={salvando} onClick={salvar} disabled={!form.titulo.trim() || !form.conteudo.trim()}>
              Salvar
            </Button>
          </>
        }
      >
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Título</label>
            <input
              value={form.titulo}
              onChange={(ev) => setForm((f) => ({ ...f, titulo: ev.target.value }))}
              required
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Conteúdo</label>
            <textarea
              value={form.conteudo}
              onChange={(ev) => setForm((f) => ({ ...f, conteudo: ev.target.value }))}
              required
              rows={5}
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Categoria</label>
              <select
                value={form.categoria}
                onChange={(ev) => setForm((f) => ({ ...f, categoria: ev.target.value }))}
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(ev) => setForm((f) => ({ ...f, status: ev.target.value as KnowledgeArticle['status'] }))}
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              >
                <option value="RASCUNHO">Rascunho</option>
                <option value="PUBLICADO">Publicado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Tags (separadas por vírgula)</label>
            <input
              value={form.tags}
              onChange={(ev) => setForm((f) => ({ ...f, tags: ev.target.value }))}
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
