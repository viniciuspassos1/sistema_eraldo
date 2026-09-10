import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  fetchNotificacoes,
  marcarNotificacaoVista,
  marcarNotificacaoConfirmada,
  marcarTodasVistas as apiMarcarTodasVistas,
  criarAlertaAgenda,
  type AlertaAgendaInput,
} from '../api/notificacoes';
import { playAlertSound } from '../utils/sound';
import { useAuth } from './AuthContext';
import type { Notification } from '../types';

interface NotificacoesContextValue {
  notificacoes: Notification[] | null;
  naoLidasCount: number;
  painelAberto: boolean;
  abrirPainel: () => void;
  fecharPainel: () => void;
  togglePainel: () => void;
  marcarVista: (id: string) => void;
  marcarConfirmada: (id: string) => void;
  marcarTodasVistas: () => void;
  /** Usado pelo AgendaAlerts.tsx quando o horário de um compromisso chega —
   * cria (ou recupera, se já existia) a notificação no banco; só toca o som
   * e abre o painel se for de fato nova (evita repetir o alarme depois de
   * um reload, quando o evento já tinha sido avisado antes). */
  registrarAlertaAgenda: (input: AlertaAgendaInput) => Promise<void>;
}

const NotificacoesContext = createContext<NotificacoesContextValue | undefined>(undefined);

export function NotificacoesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notification[] | null>(null);
  const [painelAberto, setPainelAberto] = useState(false);

  const carregar = useCallback(() => {
    // Complementar ao sino, não uma página própria — se a busca falhar (ex.:
    // permissão de "notificações" desmarcada pro usuário), some silenciosamente
    // em vez de quebrar o header, que é renderizado em toda tela do app.
    fetchNotificacoes()
      .then(setNotificacoes)
      .catch(() => setNotificacoes([]));
  }, []);

  useEffect(() => {
    if (user) carregar();
  }, [user, carregar]);

  const marcarVista = useCallback((id: string) => {
    const alvo = (notificacoes ?? []).find((n) => n.id === id);
    if (!alvo || alvo.status !== 'NAO_LIDA') return;
    setNotificacoes((prev) => (prev ?? []).map((n) => (n.id === id ? { ...n, status: 'VISTA' } : n)));
    marcarNotificacaoVista(id).catch(() => {
      setNotificacoes((prev) => (prev ?? []).map((n) => (n.id === id ? { ...n, status: 'NAO_LIDA' } : n)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificacoes]);

  const marcarConfirmada = useCallback((id: string) => {
    const alvo = (notificacoes ?? []).find((n) => n.id === id);
    const statusAnterior = alvo?.status;
    if (!alvo || alvo.status === 'CONFIRMADA') return;
    setNotificacoes((prev) => (prev ?? []).map((n) => (n.id === id ? { ...n, status: 'CONFIRMADA' } : n)));
    marcarNotificacaoConfirmada(id).catch(() => {
      setNotificacoes((prev) => (prev ?? []).map((n) => (n.id === id ? { ...n, status: statusAnterior! } : n)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificacoes]);

  const marcarTodasVistas = useCallback(() => {
    setNotificacoes((prev) => (prev ?? []).map((n) => (n.status === 'NAO_LIDA' ? { ...n, status: 'VISTA' } : n)));
    apiMarcarTodasVistas().catch(carregar); // se falhar, resincroniza com o servidor em vez de deixar o estado local errado
  }, [carregar]);

  const registrarAlertaAgenda = useCallback(async (input: AlertaAgendaInput) => {
    try {
      const resultado = await criarAlertaAgenda(input);
      setNotificacoes((prev) => {
        const lista = prev ?? [];
        if (lista.some((n) => n.id === resultado.id)) return lista;
        return [resultado, ...lista];
      });
      if (resultado.criado) {
        playAlertSound();
        setPainelAberto(true);
      }
    } catch {
      // Sem conexão momentânea, etc. — o próximo ciclo de checagem do
      // AgendaAlerts tenta de novo; não é um erro que valha travar a UI.
    }
  }, []);

  const naoLidasCount = (notificacoes ?? []).filter((n) => n.status === 'NAO_LIDA').length;

  const value = useMemo<NotificacoesContextValue>(
    () => ({
      notificacoes,
      naoLidasCount,
      painelAberto,
      abrirPainel: () => setPainelAberto(true),
      fecharPainel: () => setPainelAberto(false),
      togglePainel: () => setPainelAberto((v) => !v),
      marcarVista,
      marcarConfirmada,
      marcarTodasVistas,
      registrarAlertaAgenda,
    }),
    [notificacoes, naoLidasCount, painelAberto, marcarVista, marcarConfirmada, marcarTodasVistas, registrarAlertaAgenda]
  );

  return <NotificacoesContext.Provider value={value}>{children}</NotificacoesContext.Provider>;
}

export function useNotificacoes() {
  const ctx = useContext(NotificacoesContext);
  if (!ctx) throw new Error('useNotificacoes deve ser usado dentro de NotificacoesProvider');
  return ctx;
}
