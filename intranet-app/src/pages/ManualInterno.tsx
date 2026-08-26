import { useEffect, useState } from 'react';
import { BookText, ShieldAlert } from 'lucide-react';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { fetchManualInterno, ManualInternoApiError, type CapituloManual } from '../api/manualInterno';
import { cn } from '../utils/cn';

export function ManualInterno() {
  const [capitulos, setCapitulos] = useState<CapituloManual[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ativo, setAtivo] = useState(0);

  useEffect(() => {
    fetchManualInterno()
      .then(setCapitulos)
      .catch((err) => setError(err instanceof ManualInternoApiError ? err.message : 'Erro inesperado ao carregar o manual.'));
  }, []);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <BookText className="w-5 h-5 text-gold" /> Manual Interno
        </h1>
        <p className="text-text-secondary text-sm mt-1">Guia de referência para colaboradores do escritório.</p>
      </div>

      {error ? (
        <Card>
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar o manual" description={error} />
        </Card>
      ) : capitulos === null ? (
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
          <Card className="space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </Card>
        </div>
      ) : capitulos.length === 0 ? (
        <Card>
          <EmptyState icon={BookText} title="Nenhum capítulo cadastrado" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {capitulos.map((c, i) => (
              <button
                key={c.titulo}
                onClick={() => setAtivo(i)}
                className={cn(
                  'text-left text-sm px-3 py-2 rounded-lg whitespace-nowrap lg:whitespace-normal shrink-0',
                  ativo === i ? 'bg-navy text-white font-medium' : 'text-navy hover:bg-white'
                )}
              >
                {i + 1}. {c.titulo}
              </button>
            ))}
          </nav>

          <Card>
            <h2 className="text-lg font-semibold text-navy mb-3">{capitulos[ativo].titulo}</h2>
            <p className="text-sm text-navy leading-relaxed">{capitulos[ativo].conteudo}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
