import { useEffect, useState } from 'react';
import { UserPlus, Check, ShieldAlert } from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  fetchProgresso,
  atualizarProgresso,
  fetchResumoOnboarding,
  OnboardingApiError,
  type ItemProgresso,
  type ResumoFuncionario,
} from '../api/onboarding';

export function Onboarding() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [checklist, setChecklist] = useState<ItemProgresso[] | null>(null);
  const [resumo, setResumo] = useState<ResumoFuncionario[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    fetchProgresso(user.email)
      .then(setChecklist)
      .catch((err) => setError(err instanceof OnboardingApiError ? err.message : 'Erro inesperado ao carregar o checklist.'));
    fetchResumoOnboarding()
      .then(setResumo)
      .catch(() => setResumo([]));
  }, [user?.email]);

  const concluido = (checklist ?? []).filter((c) => c.concluido).length;
  const percentual = checklist && checklist.length > 0 ? Math.round((concluido / checklist.length) * 100) : 0;

  async function toggleItem(item: ItemProgresso) {
    if (!user?.email) return;
    const anterior = checklist;
    const novoConcluido = !item.concluido;
    setChecklist((prev) => (prev ?? []).map((c) => (c.itemId === item.itemId ? { ...c, concluido: novoConcluido } : c)));

    try {
      await atualizarProgresso(user.email, item.itemId, novoConcluido);
      if (novoConcluido) {
        const restantes = (checklist ?? []).filter((c) => c.itemId !== item.itemId && !c.concluido).length;
        showToast(restantes === 0 ? 'Checklist concluído! 🎉' : `"${item.item}" concluído.`);
      }
    } catch (err) {
      setChecklist(anterior ?? null);
      showToast(err instanceof OnboardingApiError ? err.message : 'Erro ao atualizar o checklist.', 'error');
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
        <CardHeader title="Acompanhamento (administrador)" />
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
    </div>
  );
}
