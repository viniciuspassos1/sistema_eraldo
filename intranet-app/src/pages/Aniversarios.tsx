import { Cake } from 'lucide-react';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { employees } from '../mocks/employees';
import { daysUntilNextOccurrence } from '../utils/date';
import { formatDateLong } from '../utils/format';

export function Aniversarios() {
  const ordenados = [...employees].sort(
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
    </div>
  );
}
