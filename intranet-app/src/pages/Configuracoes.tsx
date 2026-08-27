import { useState, type FormEvent } from 'react';
import { Settings, ShieldCheck, KeyRound, Lock } from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { trocarSenha, AuthApiError } from '../api/auth';

export function Configuracoes() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  async function handleTrocarSenha(e: FormEvent) {
    e.preventDefault();
    setErro('');

    if (novaSenha.length < 8) {
      setErro('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro('A confirmação não bate com a nova senha.');
      return;
    }

    setStatus('loading');
    try {
      await trocarSenha(senhaAtual, novaSenha);
      setStatus('success');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      showToast('Senha atualizada com sucesso.');
      setTimeout(() => setStatus('idle'), 1500);
    } catch (err) {
      setStatus('idle');
      setErro(err instanceof AuthApiError ? err.message : 'Erro ao trocar a senha.');
    }
  }

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
        <CardHeader title="Segurança" action={<Lock className="w-4 h-4 text-gold" />} />
        <form onSubmit={handleTrocarSenha} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Senha atual</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Nova senha</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Confirmar nova senha</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
              />
            </div>
          </div>
          {erro && <p className="text-xs text-rose-600">{erro}</p>}
          <div className="flex justify-end">
            <Button type="submit" size="sm" status={status}>
              {status === 'success' ? 'Senha atualizada' : 'Trocar senha'}
            </Button>
          </div>
        </form>
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
