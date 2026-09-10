import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, DatabaseBackup, ShieldAlert, Download, RotateCw } from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { fetchBackups, dispararBackupManual, baixarBackup, BackupsApiError, type Backup } from '../api/backups';
import { formatDateTime, formatBytes } from '../utils/format';

const statusTone = {
  SUCESSO: 'success',
  EM_ANDAMENTO: 'warning',
  FALHA: 'danger',
} as const;

const statusLabel = {
  SUCESSO: 'Sucesso',
  EM_ANDAMENTO: 'Em andamento',
  FALHA: 'Falha',
} as const;

export function Backups() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [backups, setBackups] = useState<Backup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [disparando, setDisparando] = useState(false);
  const [baixandoId, setBaixandoId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function carregar() {
    return fetchBackups()
      .then(setBackups)
      .catch((err) => setError(err instanceof BackupsApiError ? err.message : 'Erro inesperado ao carregar os backups.'));
  }

  useEffect(() => {
    carregar();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Enquanto houver um backup "em andamento", atualiza a lista sozinho a
  // cada 5s — sem isso, quem clicou em "Fazer backup agora" só veria o
  // resultado dando refresh na página na mão.
  useEffect(() => {
    const temEmAndamento = (backups ?? []).some((b) => b.status === 'EM_ANDAMENTO');
    if (temEmAndamento && !pollRef.current) {
      pollRef.current = setInterval(carregar, 5000);
    } else if (!temEmAndamento && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backups]);

  async function dispararManual() {
    setDisparando(true);
    try {
      await dispararBackupManual();
      showToast('Backup iniciado — pode levar alguns minutos.');
      await carregar();
      // BackgroundTasks só roda depois da resposta HTTP voltar — a linha
      // EM_ANDAMENTO pode não existir ainda nesse primeiro carregar(). O
      // efeito que liga o polling só reage a um EM_ANDAMENTO que já esteja
      // na lista, então força mais algumas tentativas logo em seguida pra
      // não perder essa janela.
      [1000, 2500, 4500].forEach((ms) => setTimeout(carregar, ms));
    } catch (err) {
      showToast(err instanceof BackupsApiError ? err.message : 'Erro ao iniciar o backup.', 'error');
    } finally {
      setDisparando(false);
    }
  }

  async function baixar(b: Backup) {
    setBaixandoId(b.id);
    try {
      const blob = await baixarBackup(b);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = b.arquivoNome ?? `backup-${b.id}.dump`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err instanceof BackupsApiError ? err.message : 'Não foi possível baixar o backup.', 'error');
    } finally {
      setBaixandoId(null);
    }
  }

  const ultimo = (backups ?? [])[0] ?? null;
  const temEmAndamento = (backups ?? []).some((b) => b.status === 'EM_ANDAMENTO');

  return (
    <div className="max-w-4xl space-y-6">
      <button
        onClick={() => navigate('/administracao')}
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-navy"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para Administração
      </button>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
            <DatabaseBackup className="w-5 h-5 text-gold" /> Backup do Banco de Dados
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Backup completo roda automaticamente todo dia de madrugada. Histórico e disparo manual abaixo.
          </p>
        </div>
        <Button size="sm" onClick={dispararManual} status={disparando ? 'loading' : 'idle'} disabled={temEmAndamento}>
          <RotateCw className="w-4 h-4" /> Fazer backup agora
        </Button>
      </div>

      {error ? (
        <Card>
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar os backups" description={error} />
        </Card>
      ) : backups === null ? (
        <Card>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader title="Último backup" />
            {!ultimo ? (
              <EmptyState icon={DatabaseBackup} title="Nenhum backup realizado ainda" />
            ) : (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-medium text-navy">{formatDateTime(ultimo.iniciadoEm)}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {ultimo.tipo === 'MANUAL' ? 'Manual' : 'Automático'}
                    {ultimo.status === 'SUCESSO' && ` · ${formatBytes(ultimo.tamanhoBytes)}`}
                  </p>
                  {ultimo.status === 'FALHA' && ultimo.erro && (
                    <p className="text-xs text-rose-600 mt-1 max-w-md">{ultimo.erro}</p>
                  )}
                </div>
                <Badge tone={statusTone[ultimo.status]}>{statusLabel[ultimo.status]}</Badge>
              </div>
            )}
          </Card>

          <Card padded={false}>
            <div className="px-6 pt-6">
              <CardHeader title="Histórico" />
            </div>
            {backups.length === 0 ? (
              <div className="pb-5">
                <EmptyState icon={DatabaseBackup} title="Nenhum backup no histórico" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-text-secondary border-b border-border">
                      <th className="px-5 py-3 font-medium whitespace-nowrap">Quando</th>
                      <th className="px-5 py-3 font-medium whitespace-nowrap">Tipo</th>
                      <th className="px-5 py-3 font-medium whitespace-nowrap">Status</th>
                      <th className="px-5 py-3 font-medium whitespace-nowrap">Tamanho</th>
                      <th className="px-5 py-3 font-medium whitespace-nowrap"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((b) => (
                      <tr key={b.id} className="border-b border-border last:border-0 hover:bg-cream/60">
                        <td className="px-5 py-3 text-text-secondary whitespace-nowrap">{formatDateTime(b.iniciadoEm)}</td>
                        <td className="px-5 py-3 text-navy whitespace-nowrap">{b.tipo === 'MANUAL' ? 'Manual' : 'Automático'}</td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <Badge tone={statusTone[b.status]}>{statusLabel[b.status]}</Badge>
                          {b.status === 'FALHA' && b.erro && (
                            <span className="block text-xs text-rose-600 mt-1 max-w-xs truncate" title={b.erro}>
                              {b.erro}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-text-secondary whitespace-nowrap">{formatBytes(b.tamanhoBytes)}</td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          {b.status === 'SUCESSO' && (
                            <button
                              onClick={() => baixar(b)}
                              disabled={baixandoId === b.id}
                              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-text-secondary hover:bg-cream hover:text-navy transition-colors disabled:opacity-40"
                              aria-label="Baixar backup"
                              title="Baixar backup"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
