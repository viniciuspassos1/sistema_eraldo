import { useEffect, useState, type FormEvent } from 'react';
import { Megaphone, ShieldAlert, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { fetchAvisos, marcarAvisoLido, criarAviso, editarAviso, excluirAviso, AvisosApiError } from '../api/avisos';
import { formatDate } from '../utils/format';
import type { Announcement } from '../types';

const PRIORIDADES: Announcement['prioridade'][] = ['INFORMATIVO', 'URGENTE', 'ADMINISTRATIVO', 'JURIDICO', 'TECNOLOGIA'];
const FORM_VAZIO = { titulo: '', conteudo: '', prioridade: 'INFORMATIVO' as Announcement['prioridade'], publico: 'Todos' };

const prioridadeTone = {
  INFORMATIVO: 'neutral',
  URGENTE: 'danger',
  ADMINISTRATIVO: 'navy',
  JURIDICO: 'gold',
  TECNOLOGIA: 'warning',
} as const;

export function Avisos() {
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'ADMINISTRADOR';
  const [avisos, setAvisos] = useState<Announcement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'nao_lidos'>('todos');
  const { showToast } = useToast();

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState<'idle' | 'loading'>('idle');

  function carregar() {
    return fetchAvisos()
      .then(setAvisos)
      .catch((err) => setError(err instanceof AvisosApiError ? err.message : 'Erro inesperado ao carregar os avisos.'));
  }

  useEffect(() => {
    carregar();
  }, []);

  const visiveis = (avisos ?? []).filter((a) => filtro === 'todos' || !a.lido);

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(a: Announcement, ev: React.MouseEvent) {
    ev.stopPropagation();
    setEditandoId(a.id);
    setForm({ titulo: a.titulo, conteudo: a.conteudo, prioridade: a.prioridade, publico: a.publico });
    setModalAberto(true);
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setSalvando('loading');
    try {
      if (editandoId) {
        await editarAviso(editandoId, form);
        showToast('Aviso atualizado.');
      } else {
        await criarAviso(form);
        showToast('Aviso publicado.');
      }
      setModalAberto(false);
      await carregar();
    } catch (err) {
      showToast(err instanceof AvisosApiError ? err.message : 'Erro ao salvar aviso.', 'error');
    } finally {
      setSalvando('idle');
    }
  }

  async function excluir(id: string, ev: React.MouseEvent) {
    ev.stopPropagation();
    if (!window.confirm('Excluir este aviso?')) return;
    try {
      await excluirAviso(id);
      showToast('Aviso excluído.');
      await carregar();
    } catch (err) {
      showToast(err instanceof AvisosApiError ? err.message : 'Erro ao excluir aviso.', 'error');
    }
  }

  async function marcarLido(id: string) {
    const aviso = (avisos ?? []).find((a) => a.id === id);
    if (!aviso || aviso.lido) return;

    setAvisos((prev) => (prev ?? []).map((a) => (a.id === id ? { ...a, lido: true } : a)));
    try {
      await marcarAvisoLido(id);
      showToast('Aviso marcado como lido.');
    } catch (err) {
      setAvisos((prev) => (prev ?? []).map((a) => (a.id === id ? { ...a, lido: false } : a)));
      showToast(err instanceof AvisosApiError ? err.message : 'Erro ao marcar aviso como lido.', 'error');
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-gold" /> Avisos
          </h1>
          <p className="text-text-secondary text-sm mt-1">Comunicados internos do escritório.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-white border border-border rounded-lg p-1">
            {(['todos', 'nao_lidos'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  filtro === f ? 'bg-navy text-white' : 'text-text-secondary'
                }`}
              >
                {f === 'todos' ? 'Todos' : 'Não lidos'}
              </button>
            ))}
          </div>
          {isAdmin && (
            <Button size="sm" onClick={abrirNovo}>
              <Plus className="w-4 h-4" /> Novo aviso
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <Card>
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar os avisos" description={error} />
        </Card>
      ) : avisos === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/3" />
            </Card>
          ))}
        </div>
      ) : visiveis.length === 0 ? (
        <Card>
          <EmptyState icon={Megaphone} title="Nenhum aviso por aqui" description="Você está em dia com os comunicados." />
        </Card>
      ) : (
        <div className="stagger-fade space-y-3">
          {visiveis.map((a) => (
            <div key={a.id}>
              <Card interactive onClick={() => marcarLido(a.id)} className={!a.lido ? 'border-gold/40' : ''}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-navy">{a.titulo}</p>
                      <Badge tone={prioridadeTone[a.prioridade]}>{a.prioridade}</Badge>
                      {!a.lido && <Badge tone="gold">Não lido</Badge>}
                    </div>
                    <p className="text-sm text-text-secondary mt-2">{a.conteudo}</p>
                    <p className="text-xs text-text-secondary mt-3">
                      {a.autor} · {formatDate(a.data)} · {a.publico}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(ev) => abrirEdicao(a, ev)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-cream hover:text-navy transition-colors"
                        aria-label="Editar aviso"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(ev) => excluir(a.id, ev)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        aria-label="Excluir aviso"
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
        title={editandoId ? 'Editar aviso' : 'Novo aviso'}
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
              rows={4}
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Prioridade</label>
              <select
                value={form.prioridade}
                onChange={(ev) => setForm((f) => ({ ...f, prioridade: ev.target.value as Announcement['prioridade'] }))}
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              >
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Público</label>
              <input
                value={form.publico}
                onChange={(ev) => setForm((f) => ({ ...f, publico: ev.target.value }))}
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
