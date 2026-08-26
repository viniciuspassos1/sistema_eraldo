import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ShieldAlert } from 'lucide-react';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { fetchFuncionarios, FuncionariosApiError } from '../api/funcionarios';
import type { User } from '../types';

const statusTone = {
  ATIVO: 'success',
  FERIAS: 'gold',
  INATIVO: 'neutral',
} as const;

export function Funcionarios() {
  const [busca, setBusca] = useState('');
  const [setor, setSetor] = useState('todos');
  const [employees, setEmployees] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFuncionarios()
      .then(setEmployees)
      .catch((err) => setError(err instanceof FuncionariosApiError ? err.message : 'Erro inesperado ao carregar funcionários.'));
  }, []);

  const setores = Array.from(new Set((employees ?? []).map((e) => e.setor)));

  const filtrados = (employees ?? []).filter((e) => {
    if (setor !== 'todos' && e.setor !== setor) return false;
    if (busca && !`${e.nome} ${e.cargo}`.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <Users className="w-5 h-5 text-gold" /> Funcionários
        </h1>
        <p className="text-text-secondary text-sm mt-1">Nossa equipe.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar por nome ou cargo..."
          className="flex-1 bg-white border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
        />
        <select
          value={setor}
          onChange={(e) => setSetor(e.target.value)}
          className="bg-white border border-border rounded-lg px-3.5 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
        >
          <option value="todos">Todos os setores</option>
          {setores.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <Card>
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar os funcionários" description={error} />
        </Card>
      ) : employees === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title="Nenhum funcionário encontrado" />
        </Card>
      ) : (
        <div className="stagger-fade grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((f) => (
            <div key={f.id}>
              <Card interactive className="flex items-center gap-4" onClick={() => navigate(`/funcionarios/${f.id}`)}>
                <Avatar nome={f.nome} size="lg" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">{f.nome}</p>
                  <p className="text-xs text-text-secondary truncate">{f.cargo}</p>
                  <p className="text-xs text-text-secondary truncate">{f.setor}</p>
                  <div className="mt-2">
                    <Badge tone={statusTone[f.status]}>{f.status}</Badge>
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
