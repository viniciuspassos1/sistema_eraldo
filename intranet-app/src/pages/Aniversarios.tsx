import { useEffect, useState, type FormEvent } from 'react';
import { Cake, ShieldAlert, TriangleAlert, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import {
  fetchColaboradores,
  criarColaborador,
  editarColaborador,
  excluirColaborador,
  ColaboradoresApiError,
} from '../api/colaboradores';
import { daysUntilNextOccurrence } from '../utils/date';
import { formatDateLong } from '../utils/format';
import type { Colaborador } from '../types';

const FORM_VAZIO = {
  nome: '',
  nomeCompleto: '',
  aniversario: '',
  restricaoAlimentar: '',
  papel: 'COLABORADOR' as Colaborador['papel'],
};

export function Aniversarios() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.perfil === 'ADMINISTRADOR';

  const [colaboradores, setColaboradores] = useState<Colaborador[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvandoForm, setSalvandoForm] = useState<'idle' | 'loading'>('idle');
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  function carregar() {
    return fetchColaboradores()
      .then(setColaboradores)
      .catch((err) =>
        setError(err instanceof ColaboradoresApiError ? err.message : 'Erro inesperado ao carregar colaboradores.')
      );
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(c: Colaborador) {
    setEditandoId(c.id);
    setForm({
      nome: c.nome,
      nomeCompleto: c.nomeCompleto ?? '',
      aniversario: c.aniversario,
      restricaoAlimentar: c.restricaoAlimentar ?? '',
      papel: c.papel,
    });
    setModalAberto(true);
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setSalvandoForm('loading');
    const input = {
      nome: form.nome,
      nomeCompleto: form.nomeCompleto.trim() || null,
      aniversario: form.aniversario,
      restricaoAlimentar: form.restricaoAlimentar.trim() || null,
      papel: form.papel,
    };
    try {
      if (editandoId) {
        await editarColaborador(editandoId, input);
        showToast('Colaborador atualizado.');
      } else {
        await criarColaborador(input);
        showToast('Colaborador cadastrado.');
      }
      setModalAberto(false);
      await carregar();
    } catch (err) {
      showToast(err instanceof ColaboradoresApiError ? err.message : 'Erro ao salvar colaborador.', 'error');
    } finally {
      setSalvandoForm('idle');
    }
  }

  async function excluir(c: Colaborador) {
    if (!window.confirm(`Remover ${c.nome} do cadastro de colaboradores?`)) return;
    setExcluindoId(c.id);
    try {
      await excluirColaborador(c.id);
      showToast('Colaborador removido.');
      await carregar();
    } catch (err) {
      showToast(err instanceof ColaboradoresApiError ? err.message : 'Erro ao remover colaborador.', 'error');
    } finally {
      setExcluindoId(null);
    }
  }

  const ordenados = [...(colaboradores ?? [])].sort(
    (a, b) => daysUntilNextOccurrence(a.aniversario) - daysUntilNextOccurrence(b.aniversario)
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
            <Cake className="w-5 h-5 text-gold" /> Aniversariantes
          </h1>
          <p className="text-text-secondary text-sm mt-1">Próximos aniversários da equipe.</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={abrirNovo}>
            <Plus className="w-4 h-4" /> Novo colaborador
          </Button>
        )}
      </div>

      {error ? (
        <Card>
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar os aniversariantes" description={error} />
        </Card>
      ) : colaboradores === null ? (
        <Card padded={false}>
          <ul className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : ordenados.length === 0 ? (
        <Card>
          <EmptyState icon={Cake} title="Nenhum colaborador cadastrado" />
        </Card>
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-border">
            {ordenados.map((c) => {
              const dias = daysUntilNextOccurrence(c.aniversario);
              return (
                <li key={c.id} className="flex items-center gap-4 px-5 py-4">
                  <Avatar nome={c.nome} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy flex items-center gap-1.5">
                      {c.nome}
                      {c.papel === 'ADMINISTRADOR' && <Badge tone="gold">Admin</Badge>}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {c.nomeCompleto ? `${c.nomeCompleto} · ` : ''}
                      {formatDateLong(c.aniversario).replace(/de \d{4}/, '').trim()}
                    </p>
                    <p
                      className={`text-xs flex items-center gap-1 mt-1 ${
                        c.restricaoAlimentar ? 'text-amber-700' : 'text-text-secondary'
                      }`}
                    >
                      {c.restricaoAlimentar && <TriangleAlert className="w-3 h-3 shrink-0" />}
                      {c.restricaoAlimentar ?? 'Não possui restrição alimentar'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {dias === 0 ? (
                      <Badge tone="gold">Hoje 🎂</Badge>
                    ) : (
                      <Badge tone="neutral">
                        em {dias} {dias === 1 ? 'dia' : 'dias'}
                      </Badge>
                    )}
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => abrirEdicao(c)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:bg-cream hover:text-navy transition-colors"
                          aria-label={`Editar ${c.nome}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => excluir(c)}
                          disabled={excluindoId === c.id}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                          aria-label={`Remover ${c.nome}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {isAdmin && (
        <Modal
          open={modalAberto}
          onClose={() => setModalAberto(false)}
          title={editandoId ? 'Editar colaborador' : 'Novo colaborador'}
          footer={
            <>
              <Button variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button status={salvandoForm} onClick={salvar} disabled={!form.nome.trim() || !form.aniversario}>
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
                placeholder="Nome usado no dia a dia"
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Nome completo</label>
              <input
                value={form.nomeCompleto}
                onChange={(ev) => setForm((f) => ({ ...f, nomeCompleto: ev.target.value }))}
                placeholder="Preencher quando for informado"
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Aniversário</label>
              <input
                type="date"
                value={form.aniversario}
                onChange={(ev) => setForm((f) => ({ ...f, aniversario: ev.target.value }))}
                required
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
              <p className="text-[11px] text-text-secondary mt-1">Só o dia e o mês são usados pelo sistema.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Alergia / intolerância alimentar</label>
              <input
                value={form.restricaoAlimentar}
                onChange={(ev) => setForm((f) => ({ ...f, restricaoAlimentar: ev.target.value }))}
                placeholder="Deixar em branco se não informado"
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Papel</label>
              <select
                value={form.papel}
                onChange={(ev) => setForm((f) => ({ ...f, papel: ev.target.value as Colaborador['papel'] }))}
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              >
                <option value="COLABORADOR">Colaborador</option>
                <option value="ADMINISTRADOR">Administrador</option>
              </select>
              <p className="text-[11px] text-text-secondary mt-1">
                Só uma etiqueta organizacional aqui — não dá acesso ao sistema.
              </p>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
