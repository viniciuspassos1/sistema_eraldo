import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Calendar, Briefcase } from 'lucide-react';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { employees } from '../mocks/employees';
import { vacations } from '../mocks/vacations';
import { hearings } from '../mocks/hearings';
import { formatDateLong, formatDate } from '../utils/format';

export function FuncionarioPerfil() {
  const { id } = useParams();
  const navigate = useNavigate();
  const funcionario = employees.find((e) => e.id === id);

  if (!funcionario) {
    return (
      <Card className="max-w-2xl">
        <EmptyState title="Funcionário não encontrado" description="Verifique o link ou volte para a listagem." />
      </Card>
    );
  }

  const feriasDoFuncionario = vacations.filter((v) => v.funcionarioId === funcionario.id);
  const audienciasDoFuncionario = hearings.filter((h) => h.advogado === funcionario.nome);

  return (
    <div className="max-w-3xl space-y-6">
      <button
        onClick={() => navigate('/funcionarios')}
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
