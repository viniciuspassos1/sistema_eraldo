import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { KeyRound, Copy, Check, RefreshCw, ShieldAlert } from 'lucide-react';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { fetchAuthenticatorCodes, AuthenticatorApiError, type AuthenticatorService } from '../api/authenticator';

function formatCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

function ServiceCard({ service }: { service: AuthenticatorService }) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();
  const pct = (service.secondsRemaining / service.periodSeconds) * 100;
  const acabando = service.secondsRemaining <= 5;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(service.code);
      setCopied(true);
      showToast('Código copiado.');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast('Não foi possível copiar automaticamente.', 'error');
    }
  }

  return (
    <div>
      <Card className="text-center" interactive={false}>
        <div className="flex items-center justify-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-gold" strokeWidth={1.75} />
          <p className="text-sm font-semibold text-navy">{service.name}</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={service.code}
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.94 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="font-mono text-3xl tracking-[0.15em] text-navy tabular-nums"
          >
            {formatCode(service.code)}
          </motion.p>
        </AnimatePresence>

        <div className="h-1.5 bg-cream rounded-full mt-4 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${acabando ? 'bg-rose-500' : 'bg-gold'}`}
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: 'linear' }}
          />
        </div>
        <p className="text-[11px] text-text-secondary mt-1.5">{service.secondsRemaining}s</p>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Código atualizado
          </span>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 text-xs font-medium bg-navy text-white rounded-lg px-3 py-1.5 hover:bg-navy-light transition-colors duration-150"
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Copiado
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </Card>
    </div>
  );
}

export function MeuAuthenticator() {
  const [services, setServices] = useState<AuthenticatorService[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchAuthenticatorCodes();
      setServices(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof AuthenticatorApiError ? err.message : 'Erro inesperado ao buscar códigos.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Contador local decrementa a cada segundo; quando algum serviço zera, busca os códigos novos.
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setServices((prev) => {
        if (!prev) return prev;
        const next = prev.map((s) => ({ ...s, secondsRemaining: Math.max(0, s.secondsRemaining - 1) }));
        if (next.some((s) => s.secondsRemaining === 0)) {
          load();
        }
        return next;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [load]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-gold" /> Meu Authenticator
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Acesse rapidamente seus códigos de autenticação autorizados.
        </p>
      </div>

      {error ? (
        <Card>
          <EmptyState
            icon={ShieldAlert}
            title="Não foi possível carregar os códigos"
            description={error}
          />
          <div className="flex justify-center mt-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-navy border border-border rounded-lg px-3 py-1.5 hover:bg-cream transition-colors duration-150"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Tentar de novo
            </button>
          </div>
        </Card>
      ) : services === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="space-y-3">
              <Skeleton className="h-4 w-1/2 mx-auto" />
              <Skeleton className="h-9 w-2/3 mx-auto" />
              <Skeleton className="h-1.5 w-full" />
            </Card>
          ))}
        </div>
      ) : services.length === 0 ? (
        <Card>
          <EmptyState
            icon={KeyRound}
            title="Nenhum serviço configurado"
            description="Configure AUTH_SERVICE_1_NAME e AUTH_SERVICE_1_SECRET em backend/.env."
          />
        </Card>
      ) : (
        <>
          <div className="stagger-fade grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
          {lastUpdated && (
            <p className="text-xs text-text-secondary text-center">
              Última atualização: {lastUpdated.toLocaleTimeString('pt-BR')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
