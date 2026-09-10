import { useEffect, useState, type FormEvent } from 'react';
import { Palmtree, ShieldAlert, Plus } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { fetchFerias, criarFerias, FeriasApiError } from '../api/ferias';
import { fetchFuncionarios } from '../api/funcionarios';
import { formatDate } from '../utils/format';
import type { Vacation, User } from '../types';

const statusTone = {
  AGENDADA: 'warning',
  EM_ANDAMENTO: 'gold',
  CONCLUIDA: 'neutral',
} as const;

const FORM_VAZIO = {
  funcionarioId: '',
  inicio: '',
  fim: '',
  status: 'AGENDADA' as Vacation['status'],
  observacoes: '',
};

export function Ferias() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.perfil === 'ADMINISTRADOR';

  const [status, setStatus] = useState('todos');
  const [vacations, setVacations] = useState<Vacation[] | null>(null);
  const [funcionarios, setFuncionarios] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvandoForm, setSalvandoForm] = useState<'idle' | 'loading'>('idle');

  function carregar() {
    return fetchFerias()
      .then(setVacations)
      .catch((err) => setError(err instanceof FeriasApiError ? err.message : 'Erro inesperado ao carregar as férias.'));
  }

  useEffect(() => {
    carregar();
    if (isAdmin) {
      fetchFuncionarios()
        .then(setFuncionarios)
        .catch(() => setFuncionarios([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  function abrirNovo() {
    setForm(FORM_VAZIO);
    setModalAberto(true);
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setSalvandoForm('loading');
    try {
      await criarFerias({
        funcionarioId: form.funcionarioId,
        inicio: form.inicio,
        fim: form.fim,
        status: form.status,
        observacoes: form.observacoes.trim() || undefined,
      });
      showToast('Férias registradas.');
      setModalAberto(false);
      await carregar();
    } catch (err) {
      showToast(err instanceof FeriasApiError ? err.message : 'Erro ao registrar férias.', 'error');
    } finally {
      setSalvandoForm('idle');
    }
  }

  const filtradas = (vacations ?? []).filter((v) => status === 'todos' || v.status === status);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
            <Palmtree className="w-5 h-5 text-gold" /> Férias
          </h1>
          <p className="text-text-secondary text-sm mt-1">Controle de férias da equipe.</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={abrirNovo}>
            <Plus className="w-4 h-4" /> Registrar férias
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {['todos', 'AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA'].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              status === s ? 'bg-navy text-white border-navy' : 'border-border text-navy hover:bg-cream'
            }`}
          >
            {s === 'todos' ? 'Todos' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error ? (
        <Card>
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar as férias" description={error} />
        </Card>
      ) : vacations === null ? (
        <Card padded={false}>
          <ul className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center justify-between px-5 py-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </li>
            ))}
          </ul>
        </Card>
      ) : filtradas.length === 0 ? (
        <Card>
          <EmptyState icon={Palmtree} title="Nenhum período de férias encontrado" />
        </Card>
      ) : (
        <Card padded={false}>
          <ul className="space-y-3">
            {filtradas.map((v) => (
              <li key={v.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-navy">{v.funcionarioNome}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {formatDate(v.inicio)} a {formatDate(v.fim)}
                  </p>
                </div>
                <Badge tone={statusTone[v.status]}>{v.status.replace('_', ' ')}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {isAdmin && (
        <Modal
          open={modalAberto}
          onClose={() => setModalAberto(false)}
          title="Registrar férias"
          footer={
            <>
              <Button variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button
                status={salvandoForm}
                onClick={salvar}
                disabled={!form.funcionarioId || !form.inicio || !form.fim}
              >
                Salvar
              </Button>
            </>
          }
        >
          <form onSubmit={salvar} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Funcionário</label>
              <select
                value={form.funcionarioId}
                onChange={(ev) => setForm((f) => ({ ...f, funcionarioId: ev.target.value }))}
                required
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              >
                <option value="" disabled>
                  Selecione…
                </option>
                {(funcionarios ?? []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-navy mb-1.5">Início</label>
                <input
                  type="date"
                  value={form.inicio}
                  onChange={(ev) => setForm((f) => ({ ...f, inicio: ev.target.value }))}
                  required
                  className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy mb-1.5">Fim</label>
                <input
                  type="date"
                  value={form.fim}
                  onChange={(ev) => setForm((f) => ({ ...f, fim: ev.target.value }))}
                  required
                  className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(ev) => setForm((f) => ({ ...f, status: ev.target.value as Vacation['status'] }))}
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              >
                <option value="AGENDADA">Agendada</option>
                <option value="EM_ANDAMENTO">Em andamento</option>
                <option value="CONCLUIDA">Concluída</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Observações</label>
              <input
                value={form.observacoes}
                onChange={(ev) => setForm((f) => ({ ...f, observacoes: ev.target.value }))}
                placeholder="Opcional"
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
