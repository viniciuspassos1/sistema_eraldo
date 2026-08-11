import { useState } from 'react';
import { Palmtree, List, Grid3x3 } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { vacations } from '../mocks/vacations';
import { formatDate } from '../utils/format';

const statusTone = {
  AGENDADA: 'warning',
  EM_ANDAMENTO: 'gold',
  CONCLUIDA: 'neutral',
} as const;

export function Ferias() {
  const [view, setView] = useState<'lista' | 'calendario'>('lista');
  const [status, setStatus] = useState('todos');

  const filtradas = vacations.filter((v) => status === 'todos' || v.status === status);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
            <Palmtree className="w-5 h-5 text-gold" /> Férias
          </h1>
          <p className="text-text-secondary text-sm mt-1">Controle de férias da equipe.</p>
        </div>
        <div className="flex gap-1 bg-white border border-border rounded-lg p-1">
          <button
            onClick={() => setView('lista')}
            className={`p-1.5 rounded-md ${view === 'lista' ? 'bg-navy text-white' : 'text-text-secondary'}`}
            aria-label="Visualizar em lista"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('calendario')}
            className={`p-1.5 rounded-md ${view === 'calendario' ? 'bg-navy text-white' : 'text-text-secondary'}`}
            aria-label="Visualizar em calendário"
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
        </div>
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

      {filtradas.length === 0 ? (
        <Card>
          <EmptyState icon={Palmtree} title="Nenhum período de férias encontrado" />
        </Card>
      ) : view === 'lista' ? (
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
      ) : (
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtradas.map((v) => {
              const dias = Math.round(
                (new Date(v.fim).getTime() - new Date(v.inicio).getTime()) / 86400000
              ) + 1;
              return (
                <div key={v.id} className="border border-border rounded-lg p-4">
                  <p className="text-sm font-medium text-navy">{v.funcionarioNome}</p>
                  <div className="flex items-center gap-1 mt-3 flex-wrap">
                    {Array.from({ length: Math.min(dias, 20) }).map((_, i) => (
                      <div key={i} className="w-4 h-4 rounded-sm bg-gold/60" title={`Dia ${i + 1}`} />
                    ))}
                  </div>
                  <p className="text-xs text-text-secondary mt-2">
                    {dias} dias · {formatDate(v.inicio)} a {formatDate(v.fim)}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
