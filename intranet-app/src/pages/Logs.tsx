import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ScrollText, ShieldAlert, FileText, X } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { fetchLogs, LogsApiError, type LogAuditoria } from '../api/logs';
import { fetchFuncionarios } from '../api/funcionarios';
import { formatDateTime, formatBytes } from '../utils/format';
import type { User } from '../types';

const ACAO_CATEGORIAS = [
  { valor: 'login', label: 'Login' },
  { valor: 'documento', label: 'Documentos' },
  { valor: 'colaboradores', label: 'Colaboradores' },
  { valor: 'funcionario', label: 'Funcionários' },
  { valor: 'ferias', label: 'Férias' },
  { valor: 'feriado', label: 'Feriados' },
  { valor: 'aviso', label: 'Avisos' },
  { valor: 'base_conhecimento', label: 'Base de Conhecimento' },
  { valor: 'tribunal', label: 'Tribunais' },
  { valor: 'agenda_evento', label: 'Agenda' },
  { valor: 'permissoes', label: 'Permissões' },
  { valor: 'backup', label: 'Backup' },
];

const DETALHE_LABEL: Record<string, string> = {
  documentoNome: 'Documento',
  documentoTipo: 'Tipo',
  tamanhoBytes: 'Tamanho',
  erro: 'Erro',
};

function formatarValorDetalhe(chave: string, valor: unknown): string {
  if (chave === 'tamanhoBytes' && typeof valor === 'number') return formatBytes(valor);
  if (valor === null || valor === undefined) return '—';
  return String(valor);
}

const FORM_VAZIO = { usuarioId: '', acao: '', status: '', documento: '', dataInicio: '', dataFim: '' };

export function Logs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogAuditoria[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [funcionarios, setFuncionarios] = useState<User[]>([]);
  const [filtros, setFiltros] = useState(FORM_VAZIO);
  const [detalheAberto, setDetalheAberto] = useState<LogAuditoria | null>(null);

  function carregar(f: typeof filtros = filtros) {
    setLogs(null);
    fetchLogs({
      usuarioId: f.usuarioId || undefined,
      acao: f.acao || undefined,
      status: (f.status as 'SUCESSO' | 'ERRO') || undefined,
      documento: f.documento.trim() || undefined,
      dataInicio: f.dataInicio || undefined,
      dataFim: f.dataFim || undefined,
    })
      .then(setLogs)
      .catch((err) => setError(err instanceof LogsApiError ? err.message : 'Erro inesperado ao carregar os logs.'));
  }

  useEffect(() => {
    carregar(FORM_VAZIO);
    fetchFuncionarios()
      .then(setFuncionarios)
      .catch(() => setFuncionarios([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aplicarFiltros(ev: FormEvent) {
    ev.preventDefault();
    carregar(filtros);
  }

  function limparFiltros() {
    setFiltros(FORM_VAZIO);
    carregar(FORM_VAZIO);
  }

  const filtrosAtivos = Object.values(filtros).some((v) => v !== '');

  return (
    <div className="max-w-6xl space-y-6">
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
          Registro de ações administrativas e sensíveis: login, permissões, cadastros, edições e documentos inseridos.
        </p>
      </div>

      <Card>
        <form onSubmit={aplicarFiltros} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Documento</label>
            <input
              value={filtros.documento}
              onChange={(ev) => setFiltros((f) => ({ ...f, documento: ev.target.value }))}
              placeholder="Nome do arquivo..."
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Colaborador</label>
            <select
              value={filtros.usuarioId}
              onChange={(ev) => setFiltros((f) => ({ ...f, usuarioId: ev.target.value }))}
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              <option value="">Todos</option>
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Tipo de ação</label>
            <select
              value={filtros.acao}
              onChange={(ev) => setFiltros((f) => ({ ...f, acao: ev.target.value }))}
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              <option value="">Todas</option>
              {ACAO_CATEGORIAS.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Status</label>
            <select
              value={filtros.status}
              onChange={(ev) => setFiltros((f) => ({ ...f, status: ev.target.value }))}
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              <option value="">Todos</option>
              <option value="SUCESSO">Sucesso</option>
              <option value="ERRO">Erro</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">De</label>
            <input
              type="date"
              value={filtros.dataInicio}
              onChange={(ev) => setFiltros((f) => ({ ...f, dataInicio: ev.target.value }))}
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Até</label>
            <input
              type="date"
              value={filtros.dataFim}
              onChange={(ev) => setFiltros((f) => ({ ...f, dataFim: ev.target.value }))}
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light transition-colors"
            >
              Filtrar
            </button>
            {filtrosAtivos && (
              <button type="button" onClick={limparFiltros} className="text-xs text-text-secondary hover:text-navy">
                Limpar filtros
              </button>
            )}
          </div>
        </form>
      </Card>

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
                  <th className="px-5 py-3 font-medium whitespace-nowrap">Colaborador</th>
                  <th className="px-5 py-3 font-medium whitespace-nowrap">Ação</th>
                  <th className="px-5 py-3 font-medium whitespace-nowrap">Documento inserido</th>
                  <th className="px-5 py-3 font-medium whitespace-nowrap">Entidade</th>
                  <th className="px-5 py-3 font-medium whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="stagger-fade">
                {logs.map((l) => {
                  const documentoNome = l.detalhes?.documentoNome as string | undefined;
                  return (
                    <tr
                      key={l.id}
                      onClick={() => setDetalheAberto(l)}
                      className="border-b border-border last:border-0 hover:bg-cream/60 cursor-pointer"
                    >
                      <td className="px-5 py-3 text-text-secondary whitespace-nowrap">{formatDateTime(l.criadoEm)}</td>
                      <td className="px-5 py-3 text-navy whitespace-nowrap">{l.usuarioNome ?? '—'}</td>
                      <td className="px-5 py-3 text-navy font-medium whitespace-nowrap">{l.acao}</td>
                      <td className="px-5 py-3 text-navy whitespace-nowrap">
                        {documentoNome ? (
                          <span className="inline-flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-text-secondary shrink-0" /> {documentoNome}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-5 py-3 text-text-secondary whitespace-nowrap">
                        {l.entidade ? `${l.entidade}${l.entidadeId ? ` · ${l.entidadeId.slice(0, 8)}` : ''}` : '—'}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Badge tone={l.status === 'SUCESSO' ? 'success' : 'danger'}>
                          {l.status === 'SUCESSO' ? 'Sucesso' : 'Erro'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={detalheAberto !== null}
        onClose={() => setDetalheAberto(null)}
        title="Detalhes do registro"
        footer={
          <button
            onClick={() => setDetalheAberto(null)}
            className="px-4 py-2 rounded-lg border border-border text-sm text-navy hover:bg-cream transition-colors flex items-center gap-1.5"
          >
            <X className="w-4 h-4" /> Fechar
          </button>
        }
      >
        {detalheAberto && (
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Quando</dt>
              <dd className="text-navy font-medium text-right">{formatDateTime(detalheAberto.criadoEm)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Colaborador</dt>
              <dd className="text-navy font-medium text-right">{detalheAberto.usuarioNome ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Ação</dt>
              <dd className="text-navy font-medium text-right">{detalheAberto.acao}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Status</dt>
              <dd className="text-right">
                <Badge tone={detalheAberto.status === 'SUCESSO' ? 'success' : 'danger'}>
                  {detalheAberto.status === 'SUCESSO' ? 'Sucesso' : 'Erro'}
                </Badge>
              </dd>
            </div>
            {detalheAberto.entidade && (
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">Entidade</dt>
                <dd className="text-navy font-medium text-right">
                  {detalheAberto.entidade}
                  {detalheAberto.entidadeId ? ` · ${detalheAberto.entidadeId}` : ''}
                </dd>
              </div>
            )}
            {detalheAberto.detalhes &&
              Object.entries(detalheAberto.detalhes).map(([chave, valor]) => (
                <div key={chave} className="flex justify-between gap-4">
                  <dt className="text-text-secondary">{DETALHE_LABEL[chave] ?? chave}</dt>
                  <dd className="text-navy font-medium text-right break-all">{formatarValorDetalhe(chave, valor)}</dd>
                </div>
              ))}
          </dl>
        )}
      </Modal>
    </div>
  );
}
