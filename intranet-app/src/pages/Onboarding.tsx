import { useEffect, useState, type FormEvent } from 'react';
import { UserPlus, Plus, Check, ShieldAlert } from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { criarFuncionario, FuncionariosApiError } from '../api/funcionarios';
import {
  fetchProgresso,
  atualizarProgresso,
  fetchResumoOnboarding,
  OnboardingApiError,
  type ItemProgresso,
  type ResumoFuncionario,
} from '../api/onboarding';
import type { User } from '../types';

const FORM_VAZIO = {
  nome: '',
  email: '',
  senhaInicial: '',
  cargo: '',
  setor: '',
  perfil: 'FUNCIONARIO' as User['perfil'],
  dataEntrada: '',
  aniversario: '',
  telefone: '',
};

export function Onboarding() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.perfil === 'ADMINISTRADOR';
  const [checklist, setChecklist] = useState<ItemProgresso[] | null>(null);
  const [resumo, setResumo] = useState<ResumoFuncionario[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvandoForm, setSalvandoForm] = useState<'idle' | 'loading'>('idle');

  useEffect(() => {
    if (!user) return;
    fetchProgresso()
      .then(setChecklist)
      .catch((err) => setError(err instanceof OnboardingApiError ? err.message : 'Erro inesperado ao carregar o checklist.'));
    fetchResumoOnboarding()
      .then(setResumo)
      .catch(() => setResumo([]));
  }, [user]);

  const concluido = (checklist ?? []).filter((c) => c.concluido).length;
  const percentual = checklist && checklist.length > 0 ? Math.round((concluido / checklist.length) * 100) : 0;

  async function toggleItem(item: ItemProgresso) {
    if (!user) return;
    const anterior = checklist;
    const novoConcluido = !item.concluido;
    setChecklist((prev) => (prev ?? []).map((c) => (c.itemId === item.itemId ? { ...c, concluido: novoConcluido } : c)));

    try {
      await atualizarProgresso(item.itemId, novoConcluido);
      if (novoConcluido) {
        const restantes = (checklist ?? []).filter((c) => c.itemId !== item.itemId && !c.concluido).length;
        showToast(restantes === 0 ? 'Checklist concluído! 🎉' : `"${item.item}" concluído.`);
      }
    } catch (err) {
      setChecklist(anterior ?? null);
      showToast(err instanceof OnboardingApiError ? err.message : 'Erro ao atualizar o checklist.', 'error');
    }
  }

  async function criarAcesso(ev: FormEvent) {
    ev.preventDefault();
    setSalvandoForm('loading');
    try {
      await criarFuncionario({
        nome: form.nome,
        email: form.email,
        senhaInicial: form.senhaInicial,
        cargo: form.cargo,
        setor: form.setor,
        perfil: form.perfil,
        dataEntrada: form.dataEntrada,
        aniversario: form.aniversario,
        telefone: form.telefone || undefined,
      });
      showToast('Acesso do novo funcionário criado.');
      setModalAberto(false);
      setForm(FORM_VAZIO);
    } catch (err) {
      showToast(err instanceof FuncionariosApiError ? err.message : 'Erro ao criar acesso do funcionário.', 'error');
    } finally {
      setSalvandoForm('idle');
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-gold" /> Onboarding
        </h1>
        <p className="text-text-secondary text-sm mt-1">Bem-vindo(a) ao escritório, {user?.nome.split(' ')[0]}!</p>
      </div>

      <Card>
        <CardHeader title="Seu checklist de integração" />
        {error ? (
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar o checklist" description={error} />
        ) : checklist === null ? (
          <div className="space-y-3">
            <Skeleton className="h-2 w-full rounded-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="w-full h-2 bg-cream rounded-full overflow-hidden mb-1">
              <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${percentual}%` }} />
            </div>
            <p className="text-xs text-text-secondary mb-5">{percentual}% concluído</p>

            <ul className="space-y-2">
              {checklist.map((c) => (
                <li key={c.itemId}>
                  <button
                    onClick={() => toggleItem(c)}
                    className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg hover:bg-cream transition-colors duration-150"
                  >
                    <span
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors duration-150 ${
                        c.concluido ? 'bg-navy border-navy' : 'border-border'
                      }`}
                    >
                      {c.concluido && <Check className="w-3.5 h-3.5 text-white" />}
                    </span>
                    <span className={`text-sm transition-colors duration-150 ${c.concluido ? 'text-text-secondary line-through' : 'text-navy'}`}>
                      {c.item}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Acompanhamento (administrador)"
          action={
            isAdmin && (
              <button
                onClick={() => setModalAberto(true)}
                aria-label="Criar acesso de novo funcionário"
                title="Criar acesso de novo funcionário"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            )
          }
        />
        {resumo === null ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : resumo.length === 0 ? (
          <EmptyState title="Nenhum funcionário em onboarding no momento" />
        ) : (
          <ul className="space-y-3">
            {resumo.map((f) => (
              <li key={f.funcionarioId} className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy">{f.nome}</p>
                  <p className="text-xs text-text-secondary">{f.cargo}</p>
                  <div className="w-full h-1.5 bg-cream rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-navy rounded-full" style={{ width: `${f.percentual}%` }} />
                  </div>
                </div>
                <span className="text-xs text-text-secondary w-12 text-right shrink-0">{f.percentual}%</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {isAdmin && (
        <Modal
          open={modalAberto}
          onClose={() => setModalAberto(false)}
          title="Criar acesso de novo funcionário"
          footer={
            <>
              <Button variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button
                status={salvandoForm}
                onClick={criarAcesso}
                disabled={!form.nome.trim() || !form.email.trim() || !form.senhaInicial || !form.cargo.trim() || !form.setor.trim() || !form.dataEntrada || !form.aniversario}
              >
                Criar acesso
              </Button>
            </>
          }
        >
          <form onSubmit={criarAcesso} className="space-y-4">
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
              <label className="block text-xs font-medium text-navy mb-1.5">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(ev) => setForm((f) => ({ ...f, email: ev.target.value }))}
                required
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Senha inicial</label>
              <input
                type="text"
                value={form.senhaInicial}
                onChange={(ev) => setForm((f) => ({ ...f, senhaInicial: ev.target.value }))}
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-navy mb-1.5">Data de entrada</label>
                <input
                  type="date"
                  value={form.dataEntrada}
                  onChange={(ev) => setForm((f) => ({ ...f, dataEntrada: ev.target.value }))}
                  required
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
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-navy mb-1.5">Cargo</label>
                <input
                  value={form.cargo}
                  onChange={(ev) => setForm((f) => ({ ...f, cargo: ev.target.value }))}
                  required
                  className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy mb-1.5">Setor</label>
                <input
                  value={form.setor}
                  onChange={(ev) => setForm((f) => ({ ...f, setor: ev.target.value }))}
                  required
                  className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-navy mb-1.5">Perfil</label>
                <select
                  value={form.perfil}
                  onChange={(ev) => setForm((f) => ({ ...f, perfil: ev.target.value as User['perfil'] }))}
                  className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
                >
                  <option value="FUNCIONARIO">Funcionário</option>
                  <option value="GESTOR">Gestor</option>
                  <option value="ADMINISTRADOR">Administrador</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-navy mb-1.5">Telefone</label>
                <input
                  value={form.telefone}
                  onChange={(ev) => setForm((f) => ({ ...f, telefone: ev.target.value }))}
                  className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
                />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
