import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { fetchAgendaEventos, AgendaApiError } from '../api/agenda';
import {
  fetchAnotacoes,
  criarAnotacao,
  atualizarAnotacao,
  apagarAnotacao,
  AgendaAnotacoesApiError,
  type AnotacaoAgenda,
} from '../api/agendaAnotacoes';
import { useToast } from '../components/Toast';
import { formatDate } from '../utils/format';
import { todayISO } from '../utils/date';
import type { AgendaEvent } from '../types';

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
  const [eventos, setEventos] = useState<AgendaEvent[]>([]);
  const [notas, setNotas] = useState<AnotacaoAgenda[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchAgendaEventos()
      .then(setEventos)
      .catch((err) => setErro(err instanceof AgendaApiError ? err.message : 'Erro inesperado ao carregar os compromissos.'));
    fetchAnotacoes()
      .then(setNotas)
      .catch(() => {});
  }, []);

  async function handleCriarNota(data: string, horario: string, texto: string) {
    try {
      const nova = await criarAnotacao(data, horario, texto);
      setNotas((prev) => [...prev, nova]);
    } catch (err) {
      showToast(err instanceof AgendaAnotacoesApiError ? err.message : 'Erro ao salvar a anotação.', 'error');
    }
  }

  async function handleAtualizarNota(id: string, texto: string) {
    const anterior = notas;
    setNotas((prev) => prev.map((n) => (n.id === id ? { ...n, texto } : n)));
    try {
      await atualizarAnotacao(id, texto);
    } catch (err) {
      setNotas(anterior);
      showToast(err instanceof AgendaAnotacoesApiError ? err.message : 'Erro ao atualizar a anotação.', 'error');
    }
  }

  async function handleApagarNota(id: string) {
    const anterior = notas;
    setNotas((prev) => prev.filter((n) => n.id !== id));
    try {
      await apagarAnotacao(id);
    } catch (err) {
      setNotas(anterior);
      showToast(err instanceof AgendaAnotacoesApiError ? err.message : 'Erro ao apagar a anotação.', 'error');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-gold" /> Agenda
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Compromissos da semana. Clique em um horário vazio pra anotar algo.
        </p>
        {erro && <p className="text-xs text-rose-600 mt-1">{erro}</p>}
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
            {weekDates.map((date) => {
              const iso = toISO(date);
              return (
                <DiaColuna
                  key={iso}
                  date={date}
                  isToday={iso === todayIso}
                  gridHeight={gridHeight}
                  eventos={eventos.filter((ev) => ev.data === iso)}
                  notas={notas.filter((n) => n.data === iso)}
                  onCriar={handleCriarNota}
                  onAtualizar={handleAtualizarNota}
                  onApagar={handleApagarNota}
                />
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-text-secondary">
        Semana de {formatDate(toISO(weekDates[0]))} a {formatDate(toISO(weekDates[6]))}.
      </p>
    </div>
  );
}

function DiaColuna({
  date,
  isToday,
  gridHeight,
  eventos,
  notas,
  onCriar,
  onAtualizar,
  onApagar,
}: {
  date: Date;
  isToday: boolean;
  gridHeight: number;
  eventos: AgendaEvent[];
  notas: AnotacaoAgenda[];
  onCriar: (data: string, horario: string, texto: string) => void;
  onAtualizar: (id: string, texto: string) => void;
  onApagar: (id: string) => void;
}) {
  const iso = toISO(date);
  const [draft, setDraft] = useState<{ hora: string; texto: string } | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEdicao, setTextoEdicao] = useState('');

  function handleSlotClick(hora: string) {
    const existente = notas.find((n) => n.horario === hora);
    if (existente) {
      setEditandoId(existente.id);
      setTextoEdicao(existente.texto);
      return;
    }
    setDraft({ hora, texto: '' });
  }

  function handleDraftBlur() {
    const texto = draft?.texto.trim();
    if (draft && texto) {
      onCriar(iso, draft.hora, texto);
    }
    setDraft(null);
  }

  function handleEdicaoBlur(nota: AnotacaoAgenda) {
    const texto = textoEdicao.trim();
    if (!texto) {
      onApagar(nota.id);
    } else if (texto !== nota.texto) {
      onAtualizar(nota.id, texto);
    }
    setEditandoId(null);
  }

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
          const top = horaParaOffset(n.horario);
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
                  value={textoEdicao}
                  onChange={(e) => setTextoEdicao(e.target.value)}
                  onBlur={() => handleEdicaoBlur(n)}
                  placeholder="Anotação..."
                  rows={2}
                  className="w-full bg-transparent text-[10px] text-navy resize-none focus:outline-none placeholder:text-navy/40"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditandoId(n.id);
                    setTextoEdicao(n.texto);
                  }}
                  className="w-full text-left"
                >
                  <p className="text-[10px] font-medium text-navy leading-tight">{n.horario}</p>
                  <p className="text-[10px] text-navy/80 leading-tight break-words">{n.texto}</p>
                </button>
              )}
            </div>
          );
        })}

        {draft &&
          (() => {
            const top = horaParaOffset(draft.hora);
            if (top === null) return null;
            return (
              <div
                className="absolute left-1 right-1 rounded-md bg-gold/15 border border-gold/40 px-1.5 py-1"
                style={{ top, minHeight: ROW_HEIGHT - 6, zIndex: 20 }}
              >
                <textarea
                  autoFocus
                  value={draft.texto}
                  onChange={(e) => setDraft({ ...draft, texto: e.target.value })}
                  onBlur={handleDraftBlur}
                  placeholder="Anotação..."
                  rows={2}
                  className="w-full bg-transparent text-[10px] text-navy resize-none focus:outline-none placeholder:text-navy/40"
                />
              </div>
            );
          })()}
      </div>
    </div>
  );
}
