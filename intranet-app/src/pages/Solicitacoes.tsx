import { useState, type FormEvent } from 'react';
import { Inbox, Plus } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { requests as seed } from '../mocks/agenda';
import type { Request } from '../types';
import { formatDate } from '../utils/format';
import { todayISO } from '../utils/date';

const statusTone = {
  ABERTO: 'warning',
  EM_ANALISE: 'neutral',
  EM_ANDAMENTO: 'navy',
  RESOLVIDO: 'success',
  CANCELADO: 'danger',
} as const;

const categorias = [
  'Suporte técnico',
  'Solicitação de documento',
  'Solicitação de acesso',
  'Cadastro de funcionário',
  'Solicitação de férias',
  'Solicitação administrativa',
  'Atualização de documentação',
];

export function Solicitacoes() {
  const [status, setStatus] = useState('todos');
  const [requests, setRequests] = useState<Request[]>(seed);
  const [modalOpen, setModalOpen] = useState(false);
  const [categoria, setCategoria] = useState(categorias[0]);
  const [descricao, setDescricao] = useState('');
  const [buttonStatus, setButtonStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const { showToast } = useToast();

  const filtradas = requests.filter((r) => status === 'todos' || r.status === status);

  async function handleCriarSolicitacao(e: FormEvent) {
    e.preventDefault();
    if (!descricao.trim()) return;

    setButtonStatus('loading');
    await new Promise((r) => setTimeout(r, 600));

    const novo: Request = {
      id: crypto.randomUUID(),
      numero: `SOL-${String(93 + requests.length).padStart(4, '0')}`,
      solicitante: 'Você',
      categoria,
      descricao: descricao.trim(),
      data: todayISO(),
      status: 'ABERTO',
    };
    setRequests((prev) => [novo, ...prev]);
    setButtonStatus('success');

    await new Promise((r) => setTimeout(r, 700));
    setButtonStatus('idle');
    setModalOpen(false);
    setDescricao('');
    setCategoria(categorias[0]);
    showToast('Solicitação enviada com sucesso.');
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
            <Inbox className="w-5 h-5 text-gold" /> Central de Solicitações
          </h1>
          <p className="text-text-secondary text-sm mt-1">Chamados internos do escritório.</p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" /> Nova solicitação
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['todos', 'ABERTO', 'EM_ANALISE', 'EM_ANDAMENTO', 'RESOLVIDO', 'CANCELADO'].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors duration-150 ${
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
              <tbody className="stagger-fade">
                {filtradas.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border last:border-0 hover:bg-cream/60 transition-colors duration-150"
                  >
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova solicitação">
        <form onSubmit={handleCriarSolicitacao} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
            >
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              required
              placeholder="Descreva sua solicitação..."
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" status={buttonStatus} disabled={!descricao.trim()}>
              {buttonStatus === 'success' ? 'Enviada' : 'Enviar solicitação'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
