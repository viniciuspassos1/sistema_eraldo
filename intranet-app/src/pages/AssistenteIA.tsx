import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bot,
  Search,
  FileSearch,
  Copy,
  Check,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ShieldAlert,
  MessageCircleQuestion,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  fetchPerguntas,
  fetchPerguntaComResposta,
  criarPergunta,
  editarPergunta,
  excluirPergunta,
  ChatbotApiError,
  type PerguntaInput,
} from '../api/chatbotPerguntas';
import { fetchBaseConhecimento } from '../api/baseConhecimento';
import type { PerguntaChatbot, PerguntaComResposta, KnowledgeArticle } from '../types';

interface HistoricoItem {
  perguntaId: string;
  pergunta: string;
  carregando: boolean;
  resposta?: PerguntaComResposta['resposta'];
  erro?: string;
}

const FORM_VAZIO: PerguntaInput = { pergunta: '', categoria: '', documentoId: '', ordem: 0, ativo: true };

function CopyButton({ texto }: { texto: string }) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopied(true);
      showToast('Resposta copiada.');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast('Não foi possível copiar automaticamente.', 'error');
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-[11px] text-text-secondary hover:text-navy transition-colors duration-150"
      aria-label="Copiar resposta"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

export function AssistenteIA() {
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'ADMINISTRADOR';
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();

  const [perguntas, setPerguntas] = useState<PerguntaChatbot[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [modo, setModo] = useState<'perguntas' | 'conversa'>('perguntas');
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);

  const [documentos, setDocumentos] = useState<KnowledgeArticle[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<PerguntaInput>(FORM_VAZIO);
  const [salvando, setSalvando] = useState<'idle' | 'loading'>('idle');

  function carregar() {
    return fetchPerguntas()
      .then(setPerguntas)
      .catch((err) => setErro(err instanceof ChatbotApiError ? err.message : 'Erro inesperado ao carregar as perguntas.'));
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchBaseConhecimento().then(setDocumentos).catch(() => {});
    }
  }, [isAdmin]);

  const categorias = useMemo(() => {
    const unicas = new Set((perguntas ?? []).map((p) => p.categoria));
    return Array.from(unicas).sort();
  }, [perguntas]);

  const perguntasFiltradas = (perguntas ?? []).filter((p) => {
    if (categoriaAtiva && p.categoria !== categoriaAtiva) return false;
    if (busca && !p.pergunta.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const perguntasPorCategoria = useMemo(() => {
    const grupos = new Map<string, PerguntaChatbot[]>();
    for (const p of perguntasFiltradas) {
      grupos.set(p.categoria, [...(grupos.get(p.categoria) ?? []), p]);
    }
    return grupos;
  }, [perguntasFiltradas]);

  async function abrirPergunta(p: PerguntaChatbot) {
    setModo('conversa');
    const jaExiste = historico.some((h) => h.perguntaId === p.id);
    if (jaExiste) return;

    setHistorico((prev) => [...prev, { perguntaId: p.id, pergunta: p.pergunta, carregando: true }]);
    try {
      const completa = await fetchPerguntaComResposta(p.id);
      setHistorico((prev) => prev.map((h) => (h.perguntaId === p.id ? { ...h, carregando: false, resposta: completa.resposta } : h)));
    } catch (err) {
      const erroMsg = err instanceof ChatbotApiError ? err.message : 'Erro inesperado ao consultar a documentação.';
      setHistorico((prev) => prev.map((h) => (h.perguntaId === p.id ? { ...h, carregando: false, erro: erroMsg } : h)));
    }
  }

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(p: PerguntaChatbot, ev: React.MouseEvent) {
    ev.stopPropagation();
    setEditandoId(p.id);
    setForm({ pergunta: p.pergunta, categoria: p.categoria, documentoId: p.documentoId ?? '', ordem: p.ordem, ativo: p.ativo });
    setModalAberto(true);
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setSalvando('loading');
    try {
      if (editandoId) {
        await editarPergunta(editandoId, form);
        showToast('Pergunta atualizada.');
      } else {
        await criarPergunta(form);
        showToast('Pergunta criada.');
      }
      setModalAberto(false);
      await carregar();
    } catch (err) {
      showToast(err instanceof ChatbotApiError ? err.message : 'Erro ao salvar a pergunta.', 'error');
    } finally {
      setSalvando('idle');
    }
  }

  async function excluir(id: string, ev: React.MouseEvent) {
    ev.stopPropagation();
    if (!window.confirm('Excluir esta pergunta?')) return;
    try {
      await excluirPergunta(id);
      showToast('Pergunta excluída.');
      await carregar();
    } catch (err) {
      showToast(err instanceof ChatbotApiError ? err.message : 'Erro ao excluir a pergunta.', 'error');
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy flex items-center gap-2">
            <Bot className="w-5 h-5 text-gold" /> Central de Ajuda
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Escolha uma pergunta pronta e veja a resposta direto da documentação interna.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {historico.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModo(modo === 'perguntas' ? 'conversa' : 'perguntas')}
            >
              {modo === 'perguntas' ? (
                <>Ver conversa ({historico.length})</>
              ) : (
                <>
                  <ArrowLeft className="w-3.5 h-3.5" /> Ver perguntas
                </>
              )}
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" onClick={abrirNovo}>
              <Plus className="w-4 h-4" /> Nova pergunta
            </Button>
          )}
        </div>
      </div>

      {erro ? (
        <Card>
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar as perguntas" description={erro} />
        </Card>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          {modo === 'perguntas' ? (
            <motion.div
              key="perguntas"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.18 }}
              className="space-y-4"
            >
              <div className="relative">
                <Search className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar pergunta..."
                  className="w-full bg-white border border-border rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-navy placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-gold/40"
                />
              </div>

              {categorias.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCategoriaAtiva(null)}
                    className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
                      categoriaAtiva === null ? 'bg-navy text-white border-navy' : 'border-border text-navy hover:border-gold/50'
                    }`}
                  >
                    Todas
                  </button>
                  {categorias.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategoriaAtiva(c)}
                      className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
                        categoriaAtiva === c ? 'bg-navy text-white border-navy' : 'border-border text-navy hover:border-gold/50'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}

              {perguntas === null ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                    </Card>
                  ))}
                </div>
              ) : perguntasFiltradas.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={MessageCircleQuestion}
                    title={perguntas.length === 0 ? 'Nenhuma pergunta cadastrada ainda' : 'Nada encontrado'}
                    description={perguntas.length === 0 ? 'O administrador ainda não cadastrou perguntas.' : 'Tente buscar por outro termo ou categoria.'}
                  />
                </Card>
              ) : (
                <div className="space-y-5">
                  {Array.from(perguntasPorCategoria.entries()).map(([categoria, itens]) => (
                    <div key={categoria}>
                      <p className="text-xs font-semibold text-navy uppercase tracking-wide mb-2 px-1">{categoria}</p>
                      <div className="stagger-fade grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {itens.map((p) => (
                          <Card
                            key={p.id}
                            interactive
                            padded={false}
                            onClick={() => abrirPergunta(p)}
                            className="p-3.5 flex items-center justify-between gap-2"
                          >
                            <span className="text-sm text-navy">{p.pergunta}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {!p.ativo && <Badge tone="neutral">Inativa</Badge>}
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={(ev) => abrirEdicao(p, ev)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:bg-cream hover:text-navy transition-colors"
                                    aria-label="Editar pergunta"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(ev) => excluir(p.id, ev)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                    aria-label="Excluir pergunta"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="conversa"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.18 }}
            >
              <Card className="space-y-4">
                <AnimatePresence initial={false}>
                  {historico.map((h) => (
                    <motion.div
                      key={h.perguntaId}
                      initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reduceMotion ? 0.1 : 0.2 }}
                      className="space-y-3"
                    >
                      <div className="flex justify-end">
                        <div className="bg-navy text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-md">{h.pergunta}</div>
                      </div>

                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-gold" />
                        </div>
                        <div className="max-w-md flex-1 min-w-0">
                          {h.carregando ? (
                            <div className="bg-cream rounded-2xl rounded-tl-sm px-4 py-3 space-y-2">
                              <Skeleton className="h-3 w-40" />
                              <Skeleton className="h-3 w-56" />
                            </div>
                          ) : h.erro ? (
                            <div className="bg-rose-50 text-rose-700 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm">{h.erro}</div>
                          ) : h.resposta?.documentoEncontrado ? (
                            <>
                              <div className="bg-cream rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-navy whitespace-pre-line">
                                {h.resposta.conteudo}
                              </div>
                              <div className="flex items-center justify-between gap-3 mt-1.5 pl-1">
                                <div className="flex items-center gap-1.5 text-xs text-text-secondary min-w-0">
                                  <FileSearch className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">Fonte: {h.resposta.titulo}</span>
                                </div>
                                <CopyButton texto={h.resposta.conteudo ?? ''} />
                              </div>
                            </>
                          ) : (
                            <div className="bg-cream rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-text-secondary">
                              Essa pergunta ainda não tem um documento vinculado. Fale com o administrador.
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div className="pt-2 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => setModo('perguntas')}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Consultar outra pergunta
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        title={editandoId ? 'Editar pergunta' : 'Nova pergunta'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button
              status={salvando}
              onClick={salvar}
              disabled={!form.pergunta.trim() || !form.categoria.trim() || !form.documentoId}
            >
              Salvar
            </Button>
          </>
        }
      >
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Pergunta</label>
            <input
              value={form.pergunta}
              onChange={(ev) => setForm((f) => ({ ...f, pergunta: ev.target.value }))}
              placeholder="Ex.: Como solicitar férias?"
              required
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Categoria</label>
              <input
                value={form.categoria}
                onChange={(ev) => setForm((f) => ({ ...f, categoria: ev.target.value }))}
                placeholder="Ex.: Férias e ausências"
                required
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Ordem de exibição</label>
              <input
                type="number"
                value={form.ordem}
                onChange={(ev) => setForm((f) => ({ ...f, ordem: Number(ev.target.value) }))}
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Documento da Base de Conhecimento</label>
            <select
              value={form.documentoId}
              onChange={(ev) => setForm((f) => ({ ...f, documentoId: ev.target.value }))}
              required
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              <option value="" disabled>
                Selecione um documento...
              </option>
              {documentos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.titulo} ({d.categoria})
                </option>
              ))}
            </select>
            {documentos.length === 0 && (
              <p className="text-xs text-text-secondary mt-1.5">
                Nenhum artigo cadastrado na Base de Conhecimento ainda — cadastre um primeiro.
              </p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-navy cursor-pointer">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(ev) => setForm((f) => ({ ...f, ativo: ev.target.checked }))}
              className="w-4 h-4 rounded border-border accent-navy"
            />
            Pergunta ativa (visível pros funcionários)
          </label>
        </form>
      </Modal>
    </div>
  );
}
