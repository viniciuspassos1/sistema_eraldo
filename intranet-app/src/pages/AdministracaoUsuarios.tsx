import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { employees } from '../mocks/employees';

const perfilTone = {
  ADMINISTRADOR: 'gold',
  GESTOR: 'navy',
  FUNCIONARIO: 'neutral',
} as const;

export function AdministracaoUsuarios() {
  const navigate = useNavigate();

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
    </div>
  );
}
