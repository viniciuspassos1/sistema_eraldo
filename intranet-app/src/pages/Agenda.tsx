import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { agendaEvents } from '../mocks/agenda';
import { formatDate, formatDateLong } from '../utils/format';
import { todayISO } from '../utils/date';

const tipoLabel: Record<string, string> = {
  AUDIENCIA: 'Audiência',
  REUNIAO: 'Reunião',
  COMPROMISSO: 'Compromisso',
  EVENTO: 'Evento',
  OUTRO: 'Outro',
};

export function Agenda() {
  const [visao, setVisao] = useState<'dia' | 'semana' | 'mes'>('semana');
  const today = new Date(todayISO());

  const filtrados = agendaEvents
    .filter((ev) => {
      const data = new Date(ev.data);
      const diff = Math.round((data.getTime() - today.getTime()) / 86400000);
      if (visao === 'dia') return diff === 0;
      if (visao === 'semana') return diff >= 0 && diff <= 7;
      return diff >= 0 && diff <= 31;
    })
    .sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario));

  const porData = filtrados.reduce<Record<string, typeof filtrados>>((acc, ev) => {
    (acc[ev.data] ||= []).push(ev);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gold" /> Agenda
          </h1>
          <p className="text-text-secondary text-sm mt-1">Compromissos, reuniões e eventos do escritório.</p>
        </div>
        <div className="flex gap-1 bg-white border border-border rounded-lg p-1">
          {(['dia', 'semana', 'mes'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVisao(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${
                visao === v ? 'bg-navy text-white' : 'text-text-secondary'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {Object.keys(porData).length === 0 ? (
        <Card>
          <EmptyState icon={CalendarIcon} title="Nenhum evento neste período" description="Ajuste a visualização para ver mais compromissos." />
        </Card>
      ) : (
        Object.entries(porData).map(([data, eventos]) => (
          <Card key={data}>
            <p className="text-xs font-semibold text-gold uppercase tracking-wide mb-3">
              {formatDateLong(data)}
            </p>
            <ul className="space-y-3">
              {eventos.map((ev) => (
                <li key={ev.id} className="flex gap-4">
                  <span className="text-sm font-semibold text-navy w-12 shrink-0">{ev.horario}</span>
                  <div className="flex-1 border-l border-border pl-4">
                    <p className="text-sm text-navy">{ev.titulo}</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {tipoLabel[ev.tipo]} · {ev.responsavel}
                      {ev.local ? ` · ${ev.local}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}

      <p className="text-xs text-text-secondary">Exibindo a partir de {formatDate(todayISO())}.</p>
    </div>
  );
}
