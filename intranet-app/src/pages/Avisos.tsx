import { useEffect, useState } from 'react';
import { Megaphone, ShieldAlert } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { fetchAvisos, marcarAvisoLido, AvisosApiError } from '../api/avisos';
import { formatDate } from '../utils/format';
import type { Announcement } from '../types';

const prioridadeTone = {
  INFORMATIVO: 'neutral',
  URGENTE: 'danger',
  ADMINISTRATIVO: 'navy',
  JURIDICO: 'gold',
  TECNOLOGIA: 'warning',
} as const;

export function Avisos() {
  const [avisos, setAvisos] = useState<Announcement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'nao_lidos'>('todos');
  const { showToast } = useToast();

  useEffect(() => {
    fetchAvisos()
      .then(setAvisos)
      .catch((err) => setError(err instanceof AvisosApiError ? err.message : 'Erro inesperado ao carregar os avisos.'));
  }, []);

  const visiveis = (avisos ?? []).filter((a) => filtro === 'todos' || !a.lido);

  async function marcarLido(id: string) {
    const aviso = (avisos ?? []).find((a) => a.id === id);
    if (!aviso || aviso.lido) return;

    setAvisos((prev) => (prev ?? []).map((a) => (a.id === id ? { ...a, lido: true } : a)));
    try {
      await marcarAvisoLido(id);
      showToast('Aviso marcado como lido.');
    } catch (err) {
      setAvisos((prev) => (prev ?? []).map((a) => (a.id === id ? { ...a, lido: false } : a)));
      showToast(err instanceof AvisosApiError ? err.message : 'Erro ao marcar aviso como lido.', 'error');
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-gold" /> Avisos
          </h1>
          <p className="text-text-secondary text-sm mt-1">Comunicados internos do escritório.</p>
        </div>
        <div className="flex gap-1 bg-white border border-border rounded-lg p-1">
          {(['todos', 'nao_lidos'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                filtro === f ? 'bg-navy text-white' : 'text-text-secondary'
              }`}
            >
              {f === 'todos' ? 'Todos' : 'Não lidos'}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <Card>
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar os avisos" description={error} />
        </Card>
      ) : avisos === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/3" />
            </Card>
          ))}
        </div>
      ) : visiveis.length === 0 ? (
        <Card>
          <EmptyState icon={Megaphone} title="Nenhum aviso por aqui" description="Você está em dia com os comunicados." />
        </Card>
      ) : (
        <div className="stagger-fade space-y-3">
          {visiveis.map((a) => (
            <div key={a.id}>
              <Card interactive onClick={() => marcarLido(a.id)} className={!a.lido ? 'border-gold/40' : ''}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-navy">{a.titulo}</p>
                      <Badge tone={prioridadeTone[a.prioridade]}>{a.prioridade}</Badge>
                      {!a.lido && <Badge tone="gold">Não lido</Badge>}
                    </div>
                    <p className="text-sm text-text-secondary mt-2">{a.conteudo}</p>
                    <p className="text-xs text-text-secondary mt-3">
                      {a.autor} · {formatDate(a.data)} · {a.publico}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
