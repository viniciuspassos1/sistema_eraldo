import { useEffect, useState, type FormEvent } from 'react';
import { Link2, ExternalLink, ShieldAlert, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { fetchTribunais, criarTribunal, editarTribunal, excluirTribunal, TribunaisApiError } from '../api/tribunais';
import type { CourtLink } from '../types';

const FORM_VAZIO = { nome: '', descricao: '', url: '', categoria: '' };

export function Tribunais() {
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'ADMINISTRADOR';
  const { showToast } = useToast();
  const [courtLinks, setCourtLinks] = useState<CourtLink[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState<'idle' | 'loading'>('idle');

  function carregar() {
    return fetchTribunais()
      .then(setCourtLinks)
      .catch((err) => setError(err instanceof TribunaisApiError ? err.message : 'Erro inesperado ao carregar os tribunais.'));
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtrados = (courtLinks ?? []).filter((c) =>
    `${c.nome} ${c.descricao} ${c.categoria}`.toLowerCase().includes(busca.toLowerCase())
  );

  const categorias = Array.from(new Set(filtrados.map((c) => c.categoria)));

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(c: CourtLink) {
    setEditandoId(c.id);
    setForm({ nome: c.nome, descricao: c.descricao, url: c.url, categoria: c.categoria });
    setModalAberto(true);
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setSalvando('loading');
    try {
      if (editandoId) {
        await editarTribunal(editandoId, form);
        showToast('Tribunal atualizado.');
      } else {
        await criarTribunal(form);
        showToast('Tribunal adicionado.');
      }
      setModalAberto(false);
      await carregar();
    } catch (err) {
      showToast(err instanceof TribunaisApiError ? err.message : 'Erro ao salvar tribunal.', 'error');
    } finally {
      setSalvando('idle');
    }
  }

  async function excluir(id: string) {
    if (!window.confirm('Excluir este link?')) return;
    try {
      await excluirTribunal(id);
      showToast('Tribunal excluído.');
      await carregar();
    } catch (err) {
      showToast(err instanceof TribunaisApiError ? err.message : 'Erro ao excluir tribunal.', 'error');
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
            <Link2 className="w-5 h-5 text-gold" /> Portais Jurídicos
          </h1>
          <p className="text-text-secondary text-sm mt-1">Links rápidos para tribunais e sistemas utilizados pelo escritório.</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={abrirNovo}>
            <Plus className="w-4 h-4" /> Novo link
          </Button>
        )}
      </div>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Pesquisar tribunal..."
        className="w-full sm:max-w-sm bg-white border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
      />

      {error ? (
        <Card>
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar os tribunais" description={error} />
        </Card>
      ) : courtLinks === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-8 w-full" />
            </Card>
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <Card>
          <EmptyState icon={Link2} title="Nenhum tribunal encontrado" description="Tente pesquisar por outro termo." />
        </Card>
      ) : (
        <div className="space-y-6">
          {categorias.map((cat) => (
            <div key={cat}>
              <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">{cat}</h2>
              <div className="stagger-fade grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
                {filtrados
                  .filter((c) => c.categoria === cat)
                  .map((c) => (
                    <div key={c.id}>
                      <Card className="flex flex-col h-full">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-navy">{c.nome}</p>
                          {isAdmin && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => abrirEdicao(c)}
                                className="w-6 h-6 flex items-center justify-center rounded-md text-text-secondary hover:bg-cream hover:text-navy transition-colors"
                                aria-label="Editar"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => excluir(c.id)}
                                className="w-6 h-6 flex items-center justify-center rounded-md text-text-secondary hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                aria-label="Excluir"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary mt-1 flex-1">{c.descricao}</p>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-navy text-white rounded-lg py-2 hover:bg-navy-light transition-colors duration-150"
                        >
                          Acessar <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Card>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        title={editandoId ? 'Editar link' : 'Novo link'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button
              status={salvando}
              onClick={salvar}
              disabled={!form.nome.trim() || !form.url.trim() || !form.categoria.trim()}
            >
              Salvar
            </Button>
          </>
        }
      >
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Nome</label>
            <input
              value={form.nome}
              onChange={(ev) => setForm((f) => ({ ...f, nome: ev.target.value }))}
              required
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Descrição</label>
            <input
              value={form.descricao}
              onChange={(ev) => setForm((f) => ({ ...f, descricao: ev.target.value }))}
              required
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">URL</label>
            <input
              type="url"
              value={form.url}
              onChange={(ev) => setForm((f) => ({ ...f, url: ev.target.value }))}
              required
              placeholder="https://..."
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Categoria</label>
            <input
              value={form.categoria}
              onChange={(ev) => setForm((f) => ({ ...f, categoria: ev.target.value }))}
              required
              placeholder="Federal, Estadual, Trabalhista..."
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
