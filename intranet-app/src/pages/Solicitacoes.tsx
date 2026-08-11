import { useState } from 'react';
import { Inbox, Plus } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { requests } from '../mocks/agenda';
import { formatDate } from '../utils/format';

const statusTone = {
  ABERTO: 'warning',
  EM_ANALISE: 'neutral',
  EM_ANDAMENTO: 'navy',
  RESOLVIDO: 'success',
  CANCELADO: 'danger',
} as const;

export function Solicitacoes() {
  const [status, setStatus] = useState('todos');
  const filtradas = requests.filter((r) => status === 'todos' || r.status === status);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
            <Inbox className="w-5 h-5 text-gold" /> Central de Solicitações
          </h1>
          <p className="text-text-secondary text-sm mt-1">Chamados internos do escritório.</p>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4" /> Nova solicitação
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['todos', 'ABERTO', 'EM_ANALISE', 'EM_ANDAMENTO', 'RESOLVIDO', 'CANCELADO'].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              status === s ? 'bg-navy text-white border-navy' : 'border-border text-navy hover:bg-cream'
            }`}
          >
            {s === 'todos' ? 'Todas' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <Card>
          <EmptyState icon={Inbox} title="Nenhuma solicitação encontrada" description="Que tal abrir uma nova solicitação?" />
        </Card>
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-secondary border-b border-border">
                  <th className="px-5 py-3 font-medium">Nº</th>
                  <th className="px-5 py-3 font-medium">Solicitante</th>
                  <th className="px-5 py-3 font-medium">Categoria</th>
                  <th className="px-5 py-3 font-medium">Responsável</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-cream/60">
                    <td className="px-5 py-3.5 text-navy font-medium whitespace-nowrap">{r.numero}</td>
                    <td className="px-5 py-3.5 text-navy whitespace-nowrap">{r.solicitante}</td>
                    <td className="px-5 py-3.5 text-text-secondary whitespace-nowrap">{r.categoria}</td>
                    <td className="px-5 py-3.5 text-text-secondary whitespace-nowrap">{r.responsavel ?? '—'}</td>
                    <td className="px-5 py-3.5 text-text-secondary whitespace-nowrap">{formatDate(r.data)}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone={statusTone[r.status]}>{r.status.replace('_', ' ')}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
