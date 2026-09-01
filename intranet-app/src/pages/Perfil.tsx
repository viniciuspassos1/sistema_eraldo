import { useEffect, useState } from 'react';
import { Mail, Phone, Calendar, Briefcase, ShieldAlert } from 'lucide-react';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { fetchFerias, FeriasApiError } from '../api/ferias';
import { formatDateLong, formatDate } from '../utils/format';
import type { Vacation } from '../types';

export function Perfil() {
  const { user } = useAuth();
  const [ferias, setFerias] = useState<Vacation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFerias()
      .then(setFerias)
      .catch((err) => setError(err instanceof FeriasApiError ? err.message : 'Erro inesperado ao carregar as férias.'));
  }, []);

  if (!user) return null;

  const minhasFerias = (ferias ?? []).filter((v) => v.funcionarioId === user.id);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-navy">Meu perfil</h1>

      <Card className="flex flex-col sm:flex-row gap-5 items-start">
        <Avatar nome={user.nome} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold text-navy">{user.nome}</h2>
            <Badge tone="navy">{user.perfil}</Badge>
          </div>
          <p className="text-text-secondary text-sm mt-0.5">
            {user.cargo} · {user.setor}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 text-sm">
            <div className="flex items-center gap-2 text-navy">
              <Mail className="w-4 h-4 text-text-secondary" /> {user.email}
            </div>
            {user.telefone && (
              <div className="flex items-center gap-2 text-navy">
                <Phone className="w-4 h-4 text-text-secondary" /> {user.telefone}
              </div>
            )}
            <div className="flex items-center gap-2 text-navy">
              <Calendar className="w-4 h-4 text-text-secondary" />
              Aniversário: {formatDateLong(user.aniversario).replace(/de \d{4}/, '').trim()}
            </div>
            <div className="flex items-center gap-2 text-navy">
              <Briefcase className="w-4 h-4 text-text-secondary" /> No escritório desde {formatDate(user.dataEntrada)}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-navy mb-4">Minhas férias</h3>
        {error ? (
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar as férias" description={error} />
        ) : ferias === null ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : minhasFerias.length === 0 ? (
          <EmptyState title="Nenhum período de férias cadastrado" />
        ) : (
          <ul className="space-y-2">
            {minhasFerias.map((v) => (
              <li key={v.id} className="flex items-center justify-between text-sm">
                <span className="text-navy">{formatDate(v.inicio)} a {formatDate(v.fim)}</span>
                <Badge tone={v.status === 'EM_ANDAMENTO' ? 'gold' : 'neutral'}>{v.status.replace('_', ' ')}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
