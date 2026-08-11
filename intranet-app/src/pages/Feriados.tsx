import { CalendarDays } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { holidays } from '../mocks/agenda';
import { formatDateLong } from '../utils/format';

export function Feriados() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-gold" /> Feriados e Recessos
        </h1>
        <p className="text-text-secondary text-sm mt-1">Calendário de feriados e recessos do escritório.</p>
      </div>

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
    </div>
  );
}
