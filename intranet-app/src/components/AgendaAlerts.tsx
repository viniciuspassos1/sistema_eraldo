import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BellRing, X } from 'lucide-react';
import { fetchAgendaEventos } from '../api/agenda';
import type { AgendaEvent } from '../types';
import { fetchAnotacoes } from '../api/agendaAnotacoes';
import { todayISO } from '../utils/date';
import { playAlertSound, falarTexto } from '../utils/sound';
import { ativarFaviconAlerta, restaurarFavicon } from '../utils/favicon';
import { useReducedMotion } from '../hooks/useReducedMotion';

const CHECK_INTERVAL_MS = 20_000;
// Três avisos por compromisso, do mais antecedente ao mais em cima da hora —
// decrescente de propósito: o loop de disparo (mais abaixo) depende dessa
// ordem pra achar sempre o limiar mais urgente já cruzado numa única checagem.
const LIMIARES_MIN = [10, 5, 3] as const;
const DURACAO_POPUP_MS = 15_000;

interface ItemAgenda {
  id: string;
  titulo: string;
  horario: string;
  local?: string;
  observacoes?: string;
}

interface Lembrete extends ItemAgenda {
  chave: string; // id do item + limiar — cada disparo tem sua própria entrada
  minutos: number;
}

function minutosAte(horario: string): number {
  const [h, m] = horario.split(':').map(Number);
  const agora = new Date();
  const alvo = new Date();
  alvo.setHours(h, m, 0, 0);
  return (alvo.getTime() - agora.getTime()) / 60000;
}

/** Sem servidor rodando o dia todo: só dispara enquanto a intranet estiver
 * aberta no navegador (verifica a cada 20s os eventos e anotações de hoje).
 * Eventos e anotações são buscados de novo a cada verificação (podem ser
 * criados/editados durante a própria sessão).
 *
 * Cada compromisso recebe até 3 avisos (10, 5 e 3 minutos antes) — um
 * Set por item guarda quais limiares já dispararam, pra nunca repetir o
 * mesmo aviso. Se a aba fica em segundo plano e o próximo check só roda
 * depois de cruzar mais de um limiar de uma vez, dispara só o mais urgente
 * dos que faltavam (evita um "aviso atrasado" acumulado e ainda válido) e
 * marca os demais como vistos, pra não aparecerem depois já sem sentido. */
export function AgendaAlerts() {
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const disparadosRef = useRef<Map<string, Set<number>>>(new Map());
  const faviconAtivoRef = useRef(false);
  // Eventos de agenda raramente mudam no meio de uma sessão aberta (ao
  // contrário de anotações pessoais, recarregadas a cada checagem) — buscar
  // uma vez só e guardar a MESMA promise (não o resultado já resolvido)
  // evita tanto rebuscar a cada 20s à toa (mais uma fonte de contenção de
  // conexão no navegador) quanto a corrida de "a primeira checagem roda
  // antes do fetch inicial terminar e não encontra nada".
  const eventosPromiseRef = useRef<Promise<AgendaEvent[]> | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    function dispararLimiar(item: ItemAgenda, minutos: number) {
      const chave = `${item.id}:${Math.ceil(minutos)}`;
      setLembretes((prev) => [...prev, { ...item, chave, minutos }]);
      setTimeout(() => {
        setLembretes((prev) => prev.filter((l) => l.chave !== chave));
      }, DURACAO_POPUP_MS);

      playAlertSound();
      falarTexto(`Lembrete: ${item.titulo}, em ${Math.ceil(minutos)} minutos.`);
    }

    function processarItem(item: ItemAgenda, minutos: number): boolean {
      if (minutos <= 0) return false;

      const jaDisparados = disparadosRef.current.get(item.id) ?? new Set<number>();
      const pendentes = LIMIARES_MIN.filter((limiar) => minutos <= limiar && !jaDisparados.has(limiar));

      if (pendentes.length > 0) {
        // Marca todos os limiares já cruzados como vistos (evita repetição
        // futura), mas só dispara o mais próximo — o único ainda relevante.
        pendentes.forEach((limiar) => jaDisparados.add(limiar));
        disparadosRef.current.set(item.id, jaDisparados);
        dispararLimiar(item, Math.min(...pendentes));
      }

      return minutos <= LIMIARES_MIN[0];
    }

    async function verificar() {
      const hojeISO = todayISO();
      let algumProximo = false;

      if (!eventosPromiseRef.current) {
        eventosPromiseRef.current = fetchAgendaEventos().catch(() => []);
      }
      const eventos = await eventosPromiseRef.current;
      for (const ev of eventos) {
        if (ev.data !== hojeISO) continue;
        const minutos = minutosAte(ev.horario);
        if (processarItem({ id: ev.id, titulo: ev.titulo, horario: ev.horario, local: ev.local, observacoes: ev.observacoes }, minutos)) {
          algumProximo = true;
        }
      }

      const anotacoes = await fetchAnotacoes().catch(() => []);
      for (const nota of anotacoes) {
        if (nota.data !== hojeISO) continue;
        const minutos = minutosAte(nota.horario);
        if (processarItem({ id: nota.id, titulo: nota.titulo, horario: nota.horario, local: nota.local, observacoes: nota.texto }, minutos)) {
          algumProximo = true;
        }
      }

      if (algumProximo !== faviconAtivoRef.current) {
        faviconAtivoRef.current = algumProximo;
        if (algumProximo) {
          ativarFaviconAlerta();
        } else {
          restaurarFavicon();
        }
      }
    }

    verificar();
    const interval = setInterval(verificar, CHECK_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      if (faviconAtivoRef.current) restaurarFavicon();
    };
  }, []);

  function fechar(chave: string) {
    setLembretes((prev) => prev.filter((l) => l.chave !== chave));
  }

  return (
    <div className="fixed top-6 right-6 z-[70] flex flex-col gap-2 w-[calc(100vw-2rem)] sm:w-96 pointer-events-none">
      <AnimatePresence>
        {lembretes.map((l) => (
          <motion.div
            key={l.chave}
            initial={{ opacity: 0, y: reduceMotion ? 0 : -12, scale: reduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -8, scale: reduceMotion ? 1 : 0.98 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.2, ease: 'easeOut' }}
            className="pointer-events-auto flex items-start gap-3 bg-white border border-gold/50 shadow-soft-lg rounded-lg p-4"
          >
            <BellRing className="w-5 h-5 text-gold shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-navy">
                Em {Math.ceil(l.minutos)} min: {l.titulo}
              </p>
              <p className="text-xs text-text-secondary mt-1">
                {l.horario}
                {l.local ? ` · ${l.local}` : ''}
              </p>
              {l.observacoes && <p className="text-xs text-text-secondary mt-1">{l.observacoes}</p>}
            </div>
            <button
              onClick={() => fechar(l.chave)}
              className="text-text-secondary hover:text-navy shrink-0"
              aria-label="Fechar lembrete"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
