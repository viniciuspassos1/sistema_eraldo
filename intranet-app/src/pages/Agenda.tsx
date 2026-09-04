import { useState, useEffect, type FormEvent } from 'react';
import { Calendar as CalendarIcon, MapPin, Trash2 } from 'lucide-react';
import { fetchAgendaEventos, AgendaApiError } from '../api/agenda';
import {
  fetchAnotacoes,
  criarAnotacao,
  atualizarAnotacao,
  apagarAnotacao,
  AgendaAnotacoesApiError,
  type AnotacaoAgenda,
  type DadosAnotacao,
} from '../api/agendaAnotacoes';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
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

const tiposDisponiveis = Object.keys(tipoLabel) as AnotacaoAgenda['tipo'][];

const HORAS_OPCOES = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTOS_OPCOES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

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

/** Duração assumida (em minutos) de cada item só pra decidir se dois horários
 * próximos "colidem" visualmente — nem eventos nem anotações têm horário de
 * término no modelo de dados, então isso não afeta nada além do layout. */
const DURACAO_LAYOUT_MIN = 45;

function horarioParaMinutos(horario: string): number {
  const [h, m] = horario.split(':').map(Number);
  return h * 60 + m;
}

/** Agrupa itens em "clusters" de horários que se sobrepõem e distribui cada
 * um numa coluna dentro do cluster (mesmo algoritmo guloso usado por
 * calendários tipo Google Calendar), pra não desenhar um em cima do outro. */
function calcularColunas<T extends { id: string; horario: string }>(
  itens: T[]
): Array<T & { coluna: number; totalColunas: number }> {
  const ordenados = [...itens].sort((a, b) => horarioParaMinutos(a.horario) - horarioParaMinutos(b.horario));
  const resultado: Array<T & { coluna: number; totalColunas: number }> = [];

  let cluster: T[] = [];
  let fimCluster = -Infinity;

  function fecharCluster() {
    if (cluster.length === 0) return;
    const finsColuna: number[] = [];
    const colunaDoItem: number[] = [];
    for (const item of cluster) {
      const inicio = horarioParaMinutos(item.horario);
      const indice = finsColuna.findIndex((fim) => fim <= inicio);
      if (indice === -1) {
        finsColuna.push(inicio + DURACAO_LAYOUT_MIN);
        colunaDoItem.push(finsColuna.length - 1);
      } else {
        finsColuna[indice] = inicio + DURACAO_LAYOUT_MIN;
        colunaDoItem.push(indice);
      }
    }
    const totalColunas = finsColuna.length;
    cluster.forEach((item, i) => resultado.push({ ...item, coluna: colunaDoItem[i], totalColunas }));
    cluster = [];
    fimCluster = -Infinity;
  }

  for (const item of ordenados) {
    const inicio = horarioParaMinutos(item.horario);
    if (cluster.length > 0 && inicio >= fimCluster) {
      fecharCluster();
    }
    cluster.push(item);
    fimCluster = Math.max(fimCluster, inicio + DURACAO_LAYOUT_MIN);
  }
  fecharCluster();

  return resultado;
}

interface ModalState {
  modo: 'novo' | 'editar';
  data: string;
  id?: string;
  horario: string;
  titulo: string;
  tipo: AnotacaoAgenda['tipo'];
  local: string;
  texto: string;
}

export function Agenda() {
  const weekDates = getWeekDates();
  const todayIso = todayISO();
  const gridHeight = HOURS.length * ROW_HEIGHT;
  const [eventos, setEventos] = useState<AgendaEvent[]>([]);
  const [notas, setNotas] = useState<AnotacaoAgenda[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchAgendaEventos()
      .then(setEventos)
      .catch((err) => setErro(err instanceof AgendaApiError ? err.message : 'Erro inesperado ao carregar os compromissos.'));
    fetchAnotacoes()
      .then(setNotas)
      .catch(() => {});
  }, []);

  function abrirModalNovo(data: string, horario: string) {
    setModal({ modo: 'novo', data, horario, titulo: '', tipo: 'OUTRO', local: '', texto: '' });
  }

  function abrirModalEdicao(nota: AnotacaoAgenda) {
    setModal({
      modo: 'editar',
      data: nota.data,
      id: nota.id,
      horario: nota.horario,
      titulo: nota.titulo,
      tipo: nota.tipo,
      local: nota.local ?? '',
      texto: nota.texto ?? '',
    });
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault();
    if (!modal || !modal.titulo.trim()) return;

    const dados: DadosAnotacao = {
      titulo: modal.titulo.trim(),
      tipo: modal.tipo,
      local: modal.local.trim() || undefined,
      texto: modal.texto.trim() || undefined,
    };

    setSalvando(true);
    try {
      if (modal.modo === 'novo') {
        const nova = await criarAnotacao(modal.data, modal.horario, dados);
        setNotas((prev) => [...prev, nova]);
        showToast('Compromisso salvo.');
      } else if (modal.id) {
        const atualizada = await atualizarAnotacao(modal.id, dados);
        setNotas((prev) => prev.map((n) => (n.id === atualizada.id ? atualizada : n)));
        showToast('Compromisso atualizado.');
      }
      setModal(null);
    } catch (err) {
      showToast(err instanceof AgendaAnotacoesApiError ? err.message : 'Erro ao salvar o compromisso.', 'error');
    } finally {
      setSalvando(false);
    }
  }

  async function handleApagar() {
    if (!modal?.id) return;
    const id = modal.id;
    setModal(null);
    setNotas((prev) => prev.filter((n) => n.id !== id));
    try {
      await apagarAnotacao(id);
      showToast('Compromisso apagado.');
    } catch (err) {
      showToast(err instanceof AgendaAnotacoesApiError ? err.message : 'Erro ao apagar o compromisso.', 'error');
      fetchAnotacoes().then(setNotas).catch(() => {});
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-gold" /> Agenda
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Compromissos da semana. Clique em um horário vazio pra marcar algo — só você vê o que criar aqui.
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
                  onSlotClick={(horario) => abrirModalNovo(iso, horario)}
                  onNotaClick={abrirModalEdicao}
                />
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-text-secondary">
        Semana de {formatDate(toISO(weekDates[0]))} a {formatDate(toISO(weekDates[6]))}.
      </p>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.modo === 'novo' ? 'Novo compromisso' : 'Editar compromisso'}
        footer={
          modal && (
            <>
              {modal.modo === 'editar' && (
                <Button type="button" variant="outline" onClick={handleApagar} className="mr-auto text-rose-600">
                  <Trash2 className="w-3.5 h-3.5" /> Apagar
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" form="form-compromisso" loading={salvando} disabled={!modal.titulo.trim()}>
                Salvar
              </Button>
            </>
          )
        }
      >
        {modal && (
          <form id="form-compromisso" onSubmit={handleSalvar} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Título</label>
              <input
                autoFocus
                value={modal.titulo}
                onChange={(e) => setModal({ ...modal, titulo: e.target.value })}
                placeholder="Adicionar título"
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-navy mb-1.5">Data</label>
                <input
                  type="date"
                  value={modal.data}
                  disabled
                  className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy/60 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy mb-1.5">Horário</label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={modal.horario.split(':')[0]}
                    onChange={(e) => setModal({ ...modal, horario: `${e.target.value}:${modal.horario.split(':')[1]}` })}
                    className="w-full bg-cream border border-border rounded-lg px-2 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
                  >
                    {HORAS_OPCOES.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="text-navy font-semibold">:</span>
                  <select
                    value={modal.horario.split(':')[1]}
                    onChange={(e) => setModal({ ...modal, horario: `${modal.horario.split(':')[0]}:${e.target.value}` })}
                    className="w-full bg-cream border border-border rounded-lg px-2 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
                  >
                    {MINUTOS_OPCOES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Tipo</label>
              <select
                value={modal.tipo}
                onChange={(e) => setModal({ ...modal, tipo: e.target.value as AnotacaoAgenda['tipo'] })}
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
              >
                {tiposDisponiveis.map((t) => (
                  <option key={t} value={t}>
                    {tipoLabel[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Local (opcional)</label>
              <input
                value={modal.local}
                onChange={(e) => setModal({ ...modal, local: e.target.value })}
                placeholder="Ex.: Sala de reuniões, Fórum..."
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Observações (opcional)</label>
              <textarea
                value={modal.texto}
                onChange={(e) => setModal({ ...modal, texto: e.target.value })}
                rows={2}
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150 resize-none"
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function DiaColuna({
  date,
  isToday,
  gridHeight,
  eventos,
  notas,
  onSlotClick,
  onNotaClick,
}: {
  date: Date;
  isToday: boolean;
  gridHeight: number;
  eventos: AgendaEvent[];
  notas: AnotacaoAgenda[];
  onSlotClick: (horario: string) => void;
  onNotaClick: (nota: AnotacaoAgenda) => void;
}) {
  const itens = [
    ...eventos.map((ev) => ({ id: `ev-${ev.id}`, horario: ev.horario, kind: 'evento' as const, ev })),
    ...notas.map((n) => ({ id: `nota-${n.id}`, horario: n.horario, kind: 'nota' as const, nota: n })),
  ];
  const itensComLayout = calcularColunas(itens);

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
            onClick={() => onSlotClick(`${String(h).padStart(2, '0')}:00`)}
            className="absolute left-0 right-0 border-t border-border/60 hover:bg-gold/5 transition-colors"
            style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
          />
        ))}

        {itensComLayout.map((item) => {
          const top = horaParaOffset(item.horario);
          if (top === null) return null;

          const larguraPct = 100 / item.totalColunas;
          const estiloPosicao = {
            top,
            height: ROW_HEIGHT - 6,
            left: `calc(${larguraPct * item.coluna}% + 2px)`,
            width: `calc(${larguraPct}% - 4px)`,
          };

          if (item.kind === 'evento') {
            return (
              <div
                key={item.id}
                className="absolute rounded-md bg-navy/10 border border-navy/25 px-1.5 py-1 overflow-hidden pointer-events-none"
                style={estiloPosicao}
              >
                <p className="text-[10px] font-semibold text-navy leading-tight truncate">
                  {item.ev.horario} · {item.ev.titulo}
                </p>
                <p className="text-[9px] text-navy/70 leading-tight truncate">{tipoLabel[item.ev.tipo]}</p>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNotaClick(item.nota)}
              className="absolute rounded-md bg-gold/15 border border-gold/40 px-1.5 py-1 text-left overflow-hidden hover:bg-gold/25 transition-colors"
              style={{ ...estiloPosicao, zIndex: 1 }}
            >
              <p className="text-[10px] font-semibold text-navy leading-tight truncate">
                {item.nota.horario} · {item.nota.titulo}
              </p>
              {item.nota.local && (
                <p className="text-[9px] text-navy/70 leading-tight truncate flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5 shrink-0" /> {item.nota.local}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
