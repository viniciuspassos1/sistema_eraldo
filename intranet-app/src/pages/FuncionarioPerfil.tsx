import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Calendar, Briefcase, ShieldAlert } from 'lucide-react';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { fetchFuncionario, FuncionariosApiError } from '../api/funcionarios';
import { vacations } from '../mocks/vacations';
import { hearings } from '../mocks/hearings';
import { formatDateLong, formatDate } from '../utils/format';
import type { User } from '../types';

export function FuncionarioPerfil() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [funcionario, setFuncionario] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setFuncionario(null);
    setError(null);
    fetchFuncionario(id)
      .then(setFuncionario)
      .catch((err) => setError(err instanceof FuncionariosApiError ? err.message : 'Erro inesperado ao carregar o funcionário.'));
  }, [id]);

  if (error) {
    return (
      <Card className="max-w-2xl">
        <EmptyState icon={ShieldAlert} title="Não foi possível carregar o funcionário" description={error} />
      </Card>
    );
  }

  if (!funcionario) {
    return (
      <Card className="max-w-3xl flex flex-col sm:flex-row gap-5">
        <Skeleton className="w-16 h-16 rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Card>
    );
  }

  // Férias e audiências ainda vêm de mocks/vacations.ts e mocks/hearings.ts,
  // que referenciam funcionários pelo id antigo do mock (ex.: "u1") — como
  // usuarios já migrou para o Supabase (ids reais em UUID), a busca por
  // funcionarioId não bate mais. Volta a funcionar quando ferias/audiencias
  // também migrarem pro banco. Audiências continua batendo, pois usa o nome.
  const feriasDoFuncionario = vacations.filter((v) => v.funcionarioId === funcionario.id);
  const audienciasDoFuncionario = hearings.filter((h) => h.advogado === funcionario.nome);

  return (
    <div className="max-w-3xl space-y-6">
      <button
        onClick={() => navigate('/calendario?tab=funcionarios')}
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-navy"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <Card className="flex flex-col sm:flex-row gap-5 items-start">
        <Avatar nome={funcionario.nome} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-navy">{funcionario.nome}</h1>
            <Badge tone="navy">{funcionario.perfil}</Badge>
          </div>
          <p className="text-text-secondary text-sm mt-0.5">
            {funcionario.cargo} · {funcionario.setor}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 text-sm">
            <div className="flex items-center gap-2 text-navy">
              <Mail className="w-4 h-4 text-text-secondary" /> {funcionario.email}
            </div>
            {funcionario.telefone && (
              <div className="flex items-center gap-2 text-navy">
                <Phone className="w-4 h-4 text-text-secondary" /> {funcionario.telefone}
              </div>
            )}
            <div className="flex items-center gap-2 text-navy">
              <Calendar className="w-4 h-4 text-text-secondary" /> Aniversário: {formatDateLong(funcionario.aniversario).replace(/\d{4}/, '').trim()}
            </div>
            <div className="flex items-center gap-2 text-navy">
              <Briefcase className="w-4 h-4 text-text-secondary" /> No escritório desde {formatDate(funcionario.dataEntrada)}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-navy mb-4">Férias</h2>
        {feriasDoFuncionario.length === 0 ? (
          <EmptyState title="Nenhum período de férias cadastrado" />
        ) : (
          <ul className="space-y-2">
            {feriasDoFuncionario.map((v) => (
              <li key={v.id} className="flex items-center justify-between text-sm">
                <span className="text-navy">
                  {formatDate(v.inicio)} a {formatDate(v.fim)}
                </span>
                <Badge tone={v.status === 'EM_ANDAMENTO' ? 'gold' : 'neutral'}>{v.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {audienciasDoFuncionario.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-navy mb-4">Audiências sob responsabilidade</h2>
          <ul className="space-y-2">
            {audienciasDoFuncionario.map((h) => (
              <li key={h.id} className="flex items-center justify-between text-sm">
                <span className="text-navy">{h.cliente} · {h.processo}</span>
                <span className="text-text-secondary">{formatDate(h.data)} às {h.horario}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
