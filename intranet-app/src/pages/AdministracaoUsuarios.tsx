import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { fetchFuncionarios, FuncionariosApiError } from '../api/funcionarios';
import type { User } from '../types';

const perfilTone = {
  ADMINISTRADOR: 'gold',
  GESTOR: 'navy',
  FUNCIONARIO: 'neutral',
} as const;

export function AdministracaoUsuarios() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFuncionarios()
      .then(setEmployees)
      .catch((err) => setError(err instanceof FuncionariosApiError ? err.message : 'Erro inesperado ao carregar funcionários.'));
  }, []);

  return (
    <div className="max-w-4xl space-y-6">
      <button
        onClick={() => navigate('/administracao')}
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-navy"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para Administração
      </button>

      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-gold" /> Usuários e Permissões
        </h1>
        <p className="text-text-secondary text-sm mt-1">Perfis de acesso da equipe.</p>
      </div>

      {error ? (
        <Card>
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar os usuários" description={error} />
        </Card>
      ) : employees === null ? (
        <Card padded={false}>
          <ul className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-4 px-5 py-3.5">
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-border">
            {employees.map((e) => (
              <li key={e.id} className="flex items-center gap-4 px-5 py-3.5">
                <Avatar nome={e.nome} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy truncate">{e.nome}</p>
                  <p className="text-xs text-text-secondary truncate">{e.email}</p>
                </div>
                <Badge tone={perfilTone[e.perfil]}>{e.perfil}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
