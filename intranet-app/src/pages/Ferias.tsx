import { useEffect, useState } from 'react';
import { Palmtree, ShieldAlert } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { fetchFerias, FeriasApiError } from '../api/ferias';
import { formatDate } from '../utils/format';
import type { Vacation } from '../types';

const statusTone = {
  AGENDADA: 'warning',
  EM_ANDAMENTO: 'gold',
  CONCLUIDA: 'neutral',
} as const;

export function Ferias() {
  const [status, setStatus] = useState('todos');
  const [vacations, setVacations] = useState<Vacation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFerias()
      .then(setVacations)
      .catch((err) => setError(err instanceof FeriasApiError ? err.message : 'Erro inesperado ao carregar as férias.'));
  }, []);

  const filtradas = (vacations ?? []).filter((v) => status === 'todos' || v.status === status);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <Palmtree className="w-5 h-5 text-gold" /> Férias
        </h1>
        <p className="text-text-secondary text-sm mt-1">Controle de férias da equipe.</p>
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
          <ul className="divide-y divide-border">
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
    </div>
  );
}
