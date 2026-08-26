import { useEffect, useState } from 'react';
import { Cake, ShieldAlert } from 'lucide-react';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { fetchFuncionarios, FuncionariosApiError } from '../api/funcionarios';
import { daysUntilNextOccurrence } from '../utils/date';
import { formatDateLong } from '../utils/format';
import type { User } from '../types';

export function Aniversarios() {
  const [employees, setEmployees] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFuncionarios()
      .then(setEmployees)
      .catch((err) => setError(err instanceof FuncionariosApiError ? err.message : 'Erro inesperado ao carregar funcionários.'));
  }, []);

  const ordenados = [...(employees ?? [])].sort(
    (a, b) => daysUntilNextOccurrence(a.aniversario) - daysUntilNextOccurrence(b.aniversario)
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <Cake className="w-5 h-5 text-gold" /> Aniversariantes
        </h1>
        <p className="text-text-secondary text-sm mt-1">Próximos aniversários da equipe.</p>
      </div>

      {error ? (
        <Card>
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar os aniversariantes" description={error} />
        </Card>
      ) : employees === null ? (
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
          <EmptyState icon={Cake} title="Nenhum aniversariante encontrado" />
        </Card>
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-border">
            {ordenados.map((f) => {
              const dias = daysUntilNextOccurrence(f.aniversario);
              return (
                <li key={f.id} className="flex items-center gap-4 px-5 py-4">
                  <Avatar nome={f.nome} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-navy">{f.nome}</p>
                    <p className="text-xs text-text-secondary">
                      {f.cargo} · {formatDateLong(f.aniversario).replace(/de \d{4}/, '').trim()}
                    </p>
                  </div>
                  {dias === 0 ? (
                    <Badge tone="gold">Hoje 🎂</Badge>
                  ) : (
                    <Badge tone="neutral">em {dias} {dias === 1 ? 'dia' : 'dias'}</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
