import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ScrollText, ShieldAlert } from 'lucide-react';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { fetchLogs, LogsApiError, type LogAuditoria } from '../api/logs';
import { formatDate } from '../utils/format';

export function Logs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogAuditoria[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtroAcao, setFiltroAcao] = useState('');
  const [buscando, setBuscando] = useState('');

  function carregar(acao?: string) {
    setLogs(null);
    fetchLogs(acao ? { acao } : undefined)
      .then(setLogs)
      .catch((err) => setError(err instanceof LogsApiError ? err.message : 'Erro inesperado ao carregar os logs.'));
  }

  useEffect(() => {
    carregar();
  }, []);

  function buscar(ev: FormEvent) {
    ev.preventDefault();
    carregar(buscando.trim() || undefined);
    setFiltroAcao(buscando.trim());
  }

  return (
    <div className="max-w-5xl space-y-6">
      <button
        onClick={() => navigate('/administracao')}
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-navy"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para Administração
      </button>

      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-gold" /> Logs de auditoria
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Registro de ações administrativas e sensíveis: login, permissões, cadastros e edições.
        </p>
      </div>

      <form onSubmit={buscar} className="flex gap-2">
        <input
          value={buscando}
          onChange={(ev) => setBuscando(ev.target.value)}
          placeholder="Filtrar por ação (ex.: login, funcionario.criar)..."
          className="flex-1 max-w-sm bg-white border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
        />
        {filtroAcao && (
          <button
            type="button"
            onClick={() => {
              setBuscando('');
              setFiltroAcao('');
              carregar();
            }}
            className="text-xs text-text-secondary hover:text-navy self-center"
          >
            Limpar filtro
          </button>
        )}
      </form>

      {error ? (
        <Card>
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar os logs" description={error} />
        </Card>
      ) : logs === null ? (
        <Card padded={false}>
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        </Card>
      ) : logs.length === 0 ? (
        <Card>
          <EmptyState icon={ScrollText} title="Nenhum log encontrado" description="Tente outro filtro." />
        </Card>
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-secondary border-b border-border">
                  <th className="px-5 py-3 font-medium whitespace-nowrap">Quando</th>
                  <th className="px-5 py-3 font-medium whitespace-nowrap">Usuário</th>
                  <th className="px-5 py-3 font-medium whitespace-nowrap">Ação</th>
                  <th className="px-5 py-3 font-medium whitespace-nowrap">Entidade</th>
                </tr>
              </thead>
              <tbody className="stagger-fade">
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0 hover:bg-cream/60">
                    <td className="px-5 py-3 text-text-secondary whitespace-nowrap">
                      {formatDate(l.criadoEm.slice(0, 10))} {l.criadoEm.slice(11, 16)}
                    </td>
                    <td className="px-5 py-3 text-navy whitespace-nowrap">{l.usuarioNome ?? '—'}</td>
                    <td className="px-5 py-3 text-navy font-medium whitespace-nowrap">{l.acao}</td>
                    <td className="px-5 py-3 text-text-secondary whitespace-nowrap">
                      {l.entidade ? `${l.entidade}${l.entidadeId ? ` · ${l.entidadeId.slice(0, 8)}` : ''}` : '—'}
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
