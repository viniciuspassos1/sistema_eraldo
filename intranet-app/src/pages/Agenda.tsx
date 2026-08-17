import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { agendaEvents } from '../mocks/agenda';
import { formatDate } from '../utils/format';
import { todayISO } from '../utils/date';
import { loadNotas, saveNotas, type DiaNota } from '../utils/agendaNotas';

const tipoLabel: Record<string, string> = {
  AUDIENCIA: 'Audiência',
  REUNIAO: 'Reunião',
  COMPROMISSO: 'Compromisso',
  EVENTO: 'Evento',
  OUTRO: 'Outro',
};

const diaLabel = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

const START_HOUR = 7;
const END_HOUR = 20;
const ROW_HEIGHT = 48;
const HEADER_HEIGHT = 56;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekDates(): Date[] {
  const today = new Date(todayISO());
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function horaParaOffset(hora: string): number | null {
  const [h, m] = hora.split(':').map(Number);
  const decimal = h + m / 60;
  if (decimal < START_HOUR || decimal > END_HOUR + 1) return null;
  return (decimal - START_HOUR) * ROW_HEIGHT;
}

export function Agenda() {
  const weekDates = getWeekDates();
  const todayIso = todayISO();
  const gridHeight = HOURS.length * ROW_HEIGHT;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-gold" /> Agenda
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Compromissos da semana. Clique em um horário vazio pra anotar algo.
        </p>
      </div>

      <div className="flex border border-border rounded-xl overflow-hidden bg-white shadow-soft">
        <div className="shrink-0 border-r border-border" style={{ width: 52 }}>
          <div style={{ height: HEADER_HEIGHT }} />
          <div className="relative" style={{ height: gridHeight }}>
            {HOURS.map((h, i) => (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[10px] text-text-secondary"
                style={{ top: i * ROW_HEIGHT }}
              >
                {String(h).padStart(2, '0')}:00
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[900px]">
            {weekDates.map((date) => (
              <DiaColuna key={toISO(date)} date={date} isToday={toISO(date) === todayIso} gridHeight={gridHeight} />
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-text-secondary">
        Semana de {formatDate(toISO(weekDates[0]))} a {formatDate(toISO(weekDates[6]))}.
      </p>
    </div>
  );
}

function DiaColuna({ date, isToday, gridHeight }: { date: Date; isToday: boolean; gridHeight: number }) {
  const iso = toISO(date);
  const [notas, setNotas] = useState<DiaNota[]>(() => loadNotas(iso));
  const [editandoId, setEditandoId] = useState<string | null>(null);

  function persist(next: DiaNota[]) {
    setNotas(next);
    saveNotas(iso, next);
  }

  function handleSlotClick(hora: string) {
    const existente = notas.find((n) => n.hora === hora);
    if (existente) {
      setEditandoId(existente.id);
      return;
    }
    const nova: DiaNota = { id: `${iso}-${hora}-${Date.now()}`, hora, texto: '' };
    persist([...notas, nova]);
    setEditandoId(nova.id);
  }

  function handleTextoChange(id: string, texto: string) {
    setNotas((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, texto } : n));
      saveNotas(iso, next);
      return next;
    });
  }

  function handleBlur(nota: DiaNota) {
    if (!nota.texto.trim()) {
      persist(notas.filter((n) => n.id !== nota.id));
    }
    setEditandoId(null);
  }

  const eventos = agendaEvents.filter((ev) => ev.data === iso);

  return (
    <div className="border-l border-border first:border-l-0">
      <div
        className={`flex flex-col items-center justify-center border-b border-border ${isToday ? 'bg-gold/10' : ''}`}
        style={{ height: HEADER_HEIGHT }}
      >
        <p className="text-[10px] font-semibold text-text-secondary tracking-wide">{diaLabel[date.getDay()]}</p>
        <p className={`text-base font-semibold ${isToday ? 'text-gold' : 'text-navy'}`}>{date.getDate()}</p>
      </div>

      <div className="relative" style={{ height: gridHeight }}>
        {HOURS.map((h, i) => (
          <button
            key={h}
            type="button"
            onClick={() => handleSlotClick(`${String(h).padStart(2, '0')}:00`)}
            className="absolute left-0 right-0 border-t border-border/60 hover:bg-gold/5 transition-colors"
            style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
          />
        ))}

        {eventos.map((ev) => {
          const top = horaParaOffset(ev.horario);
          if (top === null) return null;
          return (
            <div
              key={ev.id}
              className="absolute left-1 right-1 rounded-md bg-navy/10 border border-navy/25 px-1.5 py-1 overflow-hidden pointer-events-none"
              style={{ top, height: ROW_HEIGHT - 6 }}
            >
              <p className="text-[10px] font-semibold text-navy leading-tight truncate">
                {ev.horario} · {ev.titulo}
              </p>
              <p className="text-[9px] text-navy/70 leading-tight truncate">{tipoLabel[ev.tipo]}</p>
            </div>
          );
        })}

        {notas.map((n) => {
          const top = horaParaOffset(n.hora);
          if (top === null) return null;
          const isEditing = editandoId === n.id;
          return (
            <div
              key={n.id}
              className="absolute left-1 right-1 rounded-md bg-gold/15 border border-gold/40 px-1.5 py-1"
              style={{ top, minHeight: ROW_HEIGHT - 6, zIndex: isEditing ? 20 : 1 }}
            >
              {isEditing ? (
                <textarea
                  autoFocus
                  value={n.texto}
                  onChange={(e) => handleTextoChange(n.id, e.target.value)}
                  onBlur={() => handleBlur(n)}
                  placeholder="Anotação..."
                  rows={2}
                  className="w-full bg-transparent text-[10px] text-navy resize-none focus:outline-none placeholder:text-navy/40"
                />
              ) : (
                <button type="button" onClick={() => setEditandoId(n.id)} className="w-full text-left">
                  <p className="text-[10px] font-medium text-navy leading-tight">{n.hora}</p>
                  <p className="text-[10px] text-navy/80 leading-tight break-words">{n.texto}</p>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
