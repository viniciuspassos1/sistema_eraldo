import { useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, ShieldAlert, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { fetchFeriados, criarFeriado, editarFeriado, excluirFeriado, FeriadosApiError, type FeriadoInput } from '../api/feriados';
import { formatDateLong } from '../utils/format';
import type { Holiday } from '../types';

const FORM_VAZIO: FeriadoInput = {
  nome: '',
  dataInicio: '',
  dataFim: '',
  tipo: 'FERIADO',
  escritorioFechado: true,
  observacao: '',
};

export function Feriados() {
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'ADMINISTRADOR';
  const { showToast } = useToast();
  const [holidays, setHolidays] = useState<Holiday[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FeriadoInput>(FORM_VAZIO);
  const [salvando, setSalvando] = useState<'idle' | 'loading'>('idle');

  function carregar() {
    return fetchFeriados()
      .then(setHolidays)
      .catch((err) => setError(err instanceof FeriadosApiError ? err.message : 'Erro inesperado ao carregar os feriados.'));
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(h: Holiday) {
    setEditandoId(h.id);
    setForm({
      nome: h.nome,
      dataInicio: h.dataInicio,
      dataFim: h.dataFim ?? '',
      tipo: h.tipo,
      escritorioFechado: h.escritorioFechado,
      observacao: h.observacao ?? '',
    });
    setModalAberto(true);
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setSalvando('loading');
    const payload: FeriadoInput = {
      nome: form.nome.trim(),
      dataInicio: form.dataInicio,
      dataFim: form.dataFim || null,
      tipo: form.tipo,
      escritorioFechado: form.escritorioFechado,
      observacao: form.observacao?.trim() || null,
    };
    try {
      if (editandoId) {
        await editarFeriado(editandoId, payload);
        showToast('Feriado atualizado.');
      } else {
        await criarFeriado(payload);
        showToast('Feriado cadastrado.');
      }
      setModalAberto(false);
      await carregar();
    } catch (err) {
      showToast(err instanceof FeriadosApiError ? err.message : 'Erro ao salvar feriado.', 'error');
    } finally {
      setSalvando('idle');
    }
  }

  async function excluir(id: string) {
    if (!window.confirm('Excluir este feriado?')) return;
    try {
      await excluirFeriado(id);
      showToast('Feriado excluído.');
      await carregar();
    } catch (err) {
      showToast(err instanceof FeriadosApiError ? err.message : 'Erro ao excluir feriado.', 'error');
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-gold" /> Feriados e Recessos
          </h1>
          <p className="text-text-secondary text-sm mt-1">Calendário de feriados e recessos do escritório.</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={abrirNovo}>
            <Plus className="w-4 h-4" /> Novo feriado
          </Button>
        )}
      </div>

      {error ? (
        <Card>
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar os feriados" description={error} />
        </Card>
      ) : holidays === null ? (
        <Card padded={false}>
          <ul className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </li>
            ))}
          </ul>
        </Card>
      ) : holidays.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarDays} title="Nenhum feriado cadastrado" />
        </Card>
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-border">
            {holidays.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-navy">{h.nome}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {formatDateLong(h.dataInicio)}
                    {h.dataFim ? ` até ${formatDateLong(h.dataFim)}` : ''}
                  </p>
                  {h.observacao && <p className="text-xs text-text-secondary mt-0.5">{h.observacao}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge tone={h.tipo === 'RECESSO' ? 'gold' : 'navy'}>{h.tipo}</Badge>
                    <span className="text-[11px] text-text-secondary">
                      {h.escritorioFechado ? 'Escritório fechado' : 'Funcionamento normal'}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => abrirEdicao(h)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-cream hover:text-navy transition-colors"
                        aria-label="Editar feriado"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => excluir(h.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        aria-label="Excluir feriado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        title={editandoId ? 'Editar feriado' : 'Novo feriado'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button status={salvando} onClick={salvar} disabled={!form.nome.trim() || !form.dataInicio}>
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
              placeholder="Ex.: Independência do Brasil"
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Data de início</label>
              <input
                type="date"
                value={form.dataInicio}
                onChange={(ev) => setForm((f) => ({ ...f, dataInicio: ev.target.value }))}
                required
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Data de fim (opcional)</label>
              <input
                type="date"
                value={form.dataFim ?? ''}
                onChange={(ev) => setForm((f) => ({ ...f, dataFim: ev.target.value }))}
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Tipo</label>
              <select
                value={form.tipo}
                onChange={(ev) => setForm((f) => ({ ...f, tipo: ev.target.value as Holiday['tipo'] }))}
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              >
                <option value="FERIADO">Feriado</option>
                <option value="RECESSO">Recesso</option>
              </select>
            </div>
            <label className="flex items-center gap-2 pb-2.5 text-sm text-navy cursor-pointer">
              <input
                type="checkbox"
                checked={form.escritorioFechado}
                onChange={(ev) => setForm((f) => ({ ...f, escritorioFechado: ev.target.checked }))}
                className="w-4 h-4 rounded border-border accent-navy"
              />
              Escritório fechado
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Observação (opcional)</label>
            <textarea
              value={form.observacao ?? ''}
              onChange={(ev) => setForm((f) => ({ ...f, observacao: ev.target.value }))}
              rows={2}
              placeholder="Ex.: Retorno em 06/01"
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
