import { useEffect, useRef } from 'react';
import { useToast } from './Toast';
import { fetchAgendaEventos } from '../api/agenda';
import { fetchAnotacoes } from '../api/agendaAnotacoes';
import { todayISO } from '../utils/date';
import { playAlertSound } from '../utils/sound';
import type { AgendaEvent } from '../types';

const CHECK_INTERVAL_MS = 20_000;
const ALERT_WINDOW_MIN = 10;

function minutosAte(horario: string): number {
  const [h, m] = horario.split(':').map(Number);
  const agora = new Date();
  const alvo = new Date();
  alvo.setHours(h, m, 0, 0);
  return (alvo.getTime() - agora.getTime()) / 60000;
}

function dentroDaJanela(minutos: number): boolean {
  return minutos > 0 && minutos <= ALERT_WINDOW_MIN;
}

/** Sem servidor rodando o dia todo: só dispara enquanto a intranet estiver
 * aberta no navegador (verifica a cada 20s os eventos e anotações de hoje).
 * Anotações são recarregadas a cada verificação porque podem ser criadas
 * durante a própria sessão (eventos não, então ficam num ref fixo). */
export function AgendaAlerts() {
  const { showToast } = useToast();
  const alertadosRef = useRef<Set<string>>(new Set());
  const eventosRef = useRef<AgendaEvent[]>([]);

  useEffect(() => {
    fetchAgendaEventos()
      .then((eventos) => {
        eventosRef.current = eventos;
      })
      .catch(() => {
        // Sem eventos reais disponíveis (backend fora do ar, etc.) — os
        // alertas de anotações pessoais continuam funcionando normalmente.
      });
  }, []);

  useEffect(() => {
    async function verificar() {
      const hojeISO = todayISO();

      for (const ev of eventosRef.current) {
        if (ev.data !== hojeISO || alertadosRef.current.has(ev.id)) continue;
        const minutos = minutosAte(ev.horario);
        if (dentroDaJanela(minutos)) {
          alertadosRef.current.add(ev.id);
          showToast(`Em ${Math.ceil(minutos)} min: ${ev.titulo} (${ev.horario})`, 'info', 10000);
          playAlertSound();
        }
      }

      const anotacoes = await fetchAnotacoes().catch(() => []);
      for (const nota of anotacoes) {
        if (nota.data !== hojeISO || alertadosRef.current.has(nota.id)) continue;
        const minutos = minutosAte(nota.horario);
        if (dentroDaJanela(minutos)) {
          alertadosRef.current.add(nota.id);
          showToast(`Em ${Math.ceil(minutos)} min: ${nota.titulo} (${nota.horario})`, 'info', 10000);
          playAlertSound();
        }
      }
    }

    verificar();
    const interval = setInterval(verificar, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [showToast]);

  return null;
}
