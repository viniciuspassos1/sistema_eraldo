import { Bell, Scale, Palmtree, Megaphone, Cake, FileText, Inbox as InboxIcon, CheckCheck, GraduationCap, CalendarClock, Check } from 'lucide-react';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { Button } from '../components/Button';
import { useNotificacoes } from '../context/NotificacoesContext';
import { formatDateTime } from '../utils/format';

const tipoIcon = {
  AUDIENCIA: Scale,
  FERIAS: Palmtree,
  AVISO: Megaphone,
  ANIVERSARIO: Cake,
  DOCUMENTO: FileText,
  SOLICITACAO: InboxIcon,
  ONBOARDING: GraduationCap,
  AGENDA: CalendarClock,
} as const;

const statusLabel = {
  NAO_LIDA: 'Não lida',
  VISTA: 'Vista',
  CONFIRMADA: 'Confirmada',
} as const;

export function Notificacoes() {
  const { notificacoes: items, naoLidasCount: naoLidas, marcarVista, marcarConfirmada, marcarTodasVistas } = useNotificacoes();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
            <Bell className="w-5 h-5 text-gold" /> Notificações
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {items === null ? 'Carregando...' : naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? 's' : ''}` : 'Tudo em dia por aqui.'}
          </p>
        </div>
        {naoLidas > 0 && (
          <Button variant="outline" size="sm" onClick={marcarTodasVistas}>
            <CheckCheck className="w-4 h-4" /> Marcar todas como vistas
          </Button>
        )}
      </div>

      {items === null ? (
        <Card padded={false}>
          <div className="p-5 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={Bell} title="Nenhuma notificação" />
        </Card>
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-border">
            {items.map((n) => {
              const Icon = tipoIcon[n.tipo];
              const ehAlertaAgenda = n.tipo === 'AGENDA';
              return (
                <li
                  key={n.id}
                  onClick={() => n.status === 'NAO_LIDA' && marcarVista(n.id)}
                  className={`flex items-start gap-3 px-5 py-4 cursor-pointer ${n.status === 'NAO_LIDA' ? 'bg-gold/5' : ''}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-navy/8 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-navy" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${n.status === 'NAO_LIDA' ? 'text-navy font-medium' : 'text-text-secondary'}`}>
                      {n.mensagem}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-text-secondary">{formatDateTime(n.data)}</p>
                      <span className="text-xs text-text-secondary/60">·</span>
                      <p className="text-xs text-text-secondary">{statusLabel[n.status]}</p>
                    </div>
                    {ehAlertaAgenda && n.status !== 'CONFIRMADA' && (
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          marcarConfirmada(n.id);
                        }}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                      >
                        <Check className="w-3.5 h-3.5" /> Confirmar
                      </button>
                    )}
                  </div>
                  {n.status === 'NAO_LIDA' && <span className="w-2 h-2 rounded-full bg-gold mt-1.5 shrink-0" />}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
