import { useEffect, useState, type FormEvent } from 'react';
import { Stethoscope, Plus, ShieldAlert, Download, Check, X } from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import {
  fetchMeusAtestados,
  fetchTodosAtestados,
  criarAtestado,
  atualizarStatusAtestado,
  baixarArquivoAtestado,
  AtestadosApiError,
} from '../api/atestados';
import type { Atestado, AtestadoAdmin } from '../types';
import { formatDate } from '../utils/format';

const statusLabel: Record<Atestado['status'], string> = {
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  RECUSADO: 'Recusado',
};

const statusTone = {
  PENDENTE: 'warning',
  APROVADO: 'success',
  RECUSADO: 'danger',
} as const;

export function Atestados() {
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'ADMINISTRADOR';
  const { showToast } = useToast();

  const [meus, setMeus] = useState<Atestado[] | null>(null);
  const [todos, setTodos] = useState<AtestadoAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [motivo, setMotivo] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [buttonStatus, setButtonStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  function carregar() {
    fetchMeusAtestados()
      .then(setMeus)
      .catch((err) => setError(err instanceof AtestadosApiError ? err.message : 'Erro inesperado ao carregar os atestados.'));
    if (isAdmin) {
      fetchTodosAtestados()
        .then(setTodos)
        .catch(() => setTodos([]));
    }
  }

  useEffect(carregar, [isAdmin]);

  async function handleEnviar(e: FormEvent) {
    e.preventDefault();
    if (!dataInicio || !dataFim || !arquivo) return;

    setButtonStatus('loading');
    try {
      const novo = await criarAtestado({ dataInicio, dataFim, motivo: motivo.trim() || undefined, arquivo });
      setMeus((prev) => [novo, ...(prev ?? [])]);
      setButtonStatus('success');
      await new Promise((r) => setTimeout(r, 700));
      setButtonStatus('idle');
      setModalOpen(false);
      setDataInicio('');
      setDataFim('');
      setMotivo('');
      setArquivo(null);
      showToast('Atestado enviado.');
    } catch (err) {
      setButtonStatus('idle');
      showToast(err instanceof AtestadosApiError ? err.message : 'Erro ao enviar o atestado.', 'error');
    }
  }

  async function handleBaixar(id: string, nome: string) {
    try {
      await baixarArquivoAtestado(id, nome);
    } catch (err) {
      showToast(err instanceof AtestadosApiError ? err.message : 'Erro ao baixar o arquivo.', 'error');
    }
  }

  async function handleDecisao(id: string, status: 'APROVADO' | 'RECUSADO') {
    const anterior = todos;
    setTodos((prev) => (prev ?? []).map((a) => (a.id === id ? { ...a, status } : a)));
    try {
      await atualizarStatusAtestado(id, status);
      showToast(status === 'APROVADO' ? 'Atestado aprovado.' : 'Atestado recusado.');
    } catch (err) {
      setTodos(anterior ?? null);
      showToast(err instanceof AtestadosApiError ? err.message : 'Erro ao atualizar o atestado.', 'error');
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-gold" /> Atestado
          </h1>
          <p className="text-text-secondary text-sm mt-1">Envie e acompanhe seus atestados médicos.</p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" /> Novo atestado
        </Button>
      </div>

      <Card>
        <CardHeader title="Meus atestados" />
        {error ? (
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar os atestados" description={error} />
        ) : meus === null ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : meus.length === 0 ? (
          <EmptyState icon={Stethoscope} title="Nenhum atestado enviado" description="Use o botão acima para enviar um." />
        ) : (
          <ul className="space-y-3">
            {meus.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-4 bg-cream rounded-lg px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy">
                    {formatDate(a.dataInicio)} a {formatDate(a.dataFim)}
                  </p>
                  {a.motivo && <p className="text-xs text-text-secondary mt-0.5">{a.motivo}</p>}
                  {a.observacoesRh && (
                    <p className="text-xs text-text-secondary mt-1 italic">RH: {a.observacoesRh}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={statusTone[a.status]}>{statusLabel[a.status]}</Badge>
                  <button
                    type="button"
                    onClick={() => handleBaixar(a.id, a.arquivoNome)}
                    className="text-text-secondary hover:text-navy transition-colors"
                    aria-label="Baixar anexo"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader title="Acompanhamento (administrador)" />
          {todos === null ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : todos.length === 0 ? (
            <EmptyState title="Nenhum atestado registrado" />
          ) : (
            <ul className="space-y-3">
              {todos.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-4 bg-cream rounded-lg px-4 py-3 flex-wrap"
                >
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-medium text-navy">{a.funcionario}</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {formatDate(a.dataInicio)} a {formatDate(a.dataFim)}
                      {a.motivo ? ` · ${a.motivo}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={statusTone[a.status]}>{statusLabel[a.status]}</Badge>
                    <button
                      type="button"
                      onClick={() => handleBaixar(a.id, a.arquivoNome)}
                      className="text-text-secondary hover:text-navy transition-colors"
                      aria-label="Baixar anexo"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {a.status === 'PENDENTE' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDecisao(a.id, 'APROVADO')}
                          className="text-emerald-600 hover:text-emerald-700 transition-colors"
                          aria-label="Aprovar"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecisao(a.id, 'RECUSADO')}
                          className="text-rose-600 hover:text-rose-700 transition-colors"
                          aria-label="Recusar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo atestado">
        <form onSubmit={handleEnviar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Data de início</label>
              <input
                type="date"
                required
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Data de fim</label>
              <input
                type="date"
                required
                min={dataInicio || undefined}
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Motivo (opcional)</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ex.: gripe, consulta médica..."
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Arquivo do atestado (PDF ou foto)</label>
            <input
              type="file"
              required
              accept=".pdf,image/*"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-navy file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-cream file:text-navy file:text-xs hover:file:bg-border/50"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" status={buttonStatus} disabled={!dataInicio || !dataFim || !arquivo}>
              {buttonStatus === 'success' ? 'Enviado' : 'Enviar atestado'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
