import { Settings, ShieldCheck, KeyRound } from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';

export function Configuracoes() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <Settings className="w-5 h-5 text-gold" /> Configurações
        </h1>
        <p className="text-text-secondary text-sm mt-1">Preferências da sua conta.</p>
      </div>

      <Card>
        <CardHeader title="Conta" />
        <p className="text-sm text-navy">{user?.nome}</p>
        <p className="text-xs text-text-secondary mt-0.5">{user?.email}</p>
      </Card>

      <Card>
        <CardHeader
          title="Autenticador"
          action={<ShieldCheck className="w-4 h-4 text-gold" />}
        />
        <p className="text-sm text-text-secondary leading-relaxed">
          Autenticação segura para proteger sua conta. Nenhum código ou segredo é armazenado no navegador —
          toda a validação acontece no backend/cofre de credenciais.
        </p>
        <Button variant="outline" size="sm" className="mt-4">
          <KeyRound className="w-4 h-4" /> Solicitar código
        </Button>
      </Card>
    </div>
  );
}
