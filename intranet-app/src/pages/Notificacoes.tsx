import { useState } from 'react';
import { Bell, Scale, Palmtree, Megaphone, Cake, FileText, Inbox as InboxIcon, CheckCheck } from 'lucide-react';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { notifications as seed } from '../mocks/agenda';
import { formatDate } from '../utils/format';

const tipoIcon = {
  AUDIENCIA: Scale,
  FERIAS: Palmtree,
  AVISO: Megaphone,
  ANIVERSARIO: Cake,
  DOCUMENTO: FileText,
  SOLICITACAO: InboxIcon,
} as const;

export function Notificacoes() {
  const [items, setItems] = useState(seed);

  function marcarTodasLidas() {
    setItems((prev) => prev.map((n) => ({ ...n, lida: true })));
  }

  function marcarLida(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
  }

  const naoLidas = items.filter((n) => !n.lida).length;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
            <Bell className="w-5 h-5 text-gold" /> Notificações
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? 's' : ''}` : 'Tudo em dia por aqui.'}
          </p>
        </div>
        {naoLidas > 0 && (
          <Button variant="outline" size="sm" onClick={marcarTodasLidas}>
            <CheckCheck className="w-4 h-4" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card>
          <EmptyState icon={Bell} title="Nenhuma notificação" />
        </Card>
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-border">
            {items.map((n) => {
              const Icon = tipoIcon[n.tipo];
              return (
                <li
                  key={n.id}
                  onClick={() => marcarLida(n.id)}
                  className={`flex items-start gap-3 px-5 py-4 cursor-pointer ${!n.lida ? 'bg-gold/5' : ''}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-navy/8 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-navy" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${n.lida ? 'text-text-secondary' : 'text-navy font-medium'}`}>{n.mensagem}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{formatDate(n.data)}</p>
                  </div>
                  {!n.lida && <span className="w-2 h-2 rounded-full bg-gold mt-1.5 shrink-0" />}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
