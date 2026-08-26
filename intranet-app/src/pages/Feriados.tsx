import { useEffect, useState } from 'react';
import { CalendarDays, ShieldAlert } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { fetchFeriados, FeriadosApiError } from '../api/feriados';
import { formatDateLong } from '../utils/format';
import type { Holiday } from '../types';

export function Feriados() {
  const [holidays, setHolidays] = useState<Holiday[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeriados()
      .then(setHolidays)
      .catch((err) => setError(err instanceof FeriadosApiError ? err.message : 'Erro inesperado ao carregar os feriados.'));
  }, []);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-gold" /> Feriados e Recessos
        </h1>
        <p className="text-text-secondary text-sm mt-1">Calendário de feriados e recessos do escritório.</p>
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
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Badge tone={h.tipo === 'RECESSO' ? 'gold' : 'navy'}>{h.tipo}</Badge>
                  <span className="text-[11px] text-text-secondary">
                    {h.escritorioFechado ? 'Escritório fechado' : 'Funcionamento normal'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
