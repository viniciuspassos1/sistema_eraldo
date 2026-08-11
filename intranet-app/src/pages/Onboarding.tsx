import { useState } from 'react';
import { UserPlus, Check } from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const checklistPadrao = [
  'Criar conta',
  'Ler manual interno',
  'Conhecer sistemas',
  'Conhecer equipe',
  'Treinamento',
  'Segurança da informação',
  'Procedimentos internos',
];

const novosFuncionarios = [
  { nome: 'Rafael Andrade', cargo: 'Estagiário Jurídico', progresso: [true, true, true, false, false, false, false] },
];

export function Onboarding() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [checklist, setChecklist] = useState(checklistPadrao.map((item, i) => ({ item, feito: i < 2 })));

  const concluido = checklist.filter((c) => c.feito).length;
  const percentual = Math.round((concluido / checklist.length) * 100);

  function toggleItem(index: number) {
    setChecklist((prev) => {
      const next = prev.map((p, idx) => (idx === index ? { ...p, feito: !p.feito } : p));
      const acabouDeConcluir = !prev[index].feito && next[index].feito;
      if (acabouDeConcluir) {
        const restantes = next.filter((n) => !n.feito).length;
        showToast(restantes === 0 ? 'Checklist concluído! 🎉' : `"${next[index].item}" concluído.`);
      }
      return next;
    });
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
        <div className="w-full h-2 bg-cream rounded-full overflow-hidden mb-1">
          <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${percentual}%` }} />
        </div>
        <p className="text-xs text-text-secondary mb-5">{percentual}% concluído</p>

        <ul className="space-y-2">
          {checklist.map((c, i) => (
            <li key={c.item}>
              <button
                onClick={() => toggleItem(i)}
                className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg hover:bg-cream transition-colors duration-150"
              >
                <span
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors duration-150 ${
                    c.feito ? 'bg-navy border-navy' : 'border-border'
                  }`}
                >
                  {c.feito && <Check className="w-3.5 h-3.5 text-white" />}
                </span>
                <span className={`text-sm transition-colors duration-150 ${c.feito ? 'text-text-secondary line-through' : 'text-navy'}`}>
                  {c.item}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Acompanhamento (administrador)" />
        <ul className="space-y-3">
          {novosFuncionarios.map((f) => {
            const feito = f.progresso.filter(Boolean).length;
            const pct = Math.round((feito / f.progresso.length) * 100);
            return (
              <li key={f.nome} className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy">{f.nome}</p>
                  <p className="text-xs text-text-secondary">{f.cargo}</p>
                  <div className="w-full h-1.5 bg-cream rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-navy rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="text-xs text-text-secondary w-12 text-right shrink-0">{pct}%</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
