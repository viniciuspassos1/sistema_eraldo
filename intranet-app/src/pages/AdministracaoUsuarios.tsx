import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ShieldAlert, Settings2 } from 'lucide-react';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { fetchFuncionarios, FuncionariosApiError } from '../api/funcionarios';
import { fetchPermissoes, salvarPermissoes, PermissoesApiError, type PermissaoPagina } from '../api/permissoes';
import type { User } from '../types';

const perfilTone = {
  ADMINISTRADOR: 'gold',
  GESTOR: 'navy',
  FUNCIONARIO: 'neutral',
} as const;

const PAGINA_LABEL: Record<string, string> = {
  dashboard: 'Dashboard',
  'meu-authenticator': 'Meu Authenticator',
  'assistente-ia': 'Assistente de IA',
  'base-conhecimento': 'Base de Conhecimento',
  calendario: 'Calendário do Escritório',
  manual: 'Manual Interno',
  documentos: 'Documentos',
  'cooperativa-ideias': 'Cooperativa de Ideias',
  tribunais: 'Portais Jurídicos (Tribunais)',
  solicitacoes: 'Solicitações',
  notificacoes: 'Notificações',
};

export function AdministracaoUsuarios() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<User | null>(null);
  const [permissoes, setPermissoes] = useState<PermissaoPagina[] | null>(null);
  const [salvando, setSalvando] = useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    fetchFuncionarios()
      .then(setEmployees)
      .catch((err) => setError(err instanceof FuncionariosApiError ? err.message : 'Erro inesperado ao carregar funcionários.'));
  }, []);

  function abrirPermissoes(funcionario: User) {
    setFuncionarioSelecionado(funcionario);
    setPermissoes(null);
    fetchPermissoes(funcionario.id)
      .then(setPermissoes)
      .catch((err) => {
        showToast(err instanceof PermissoesApiError ? err.message : 'Erro ao carregar permissões.', 'error');
        setFuncionarioSelecionado(null);
      });
  }

  function alternarPagina(pagina: string) {
    setPermissoes((prev) => (prev ?? []).map((p) => (p.pagina === pagina ? { ...p, permitido: !p.permitido } : p)));
  }

  async function handleSalvar() {
    if (!funcionarioSelecionado || !permissoes) return;
    setSalvando('loading');
    try {
      await salvarPermissoes(funcionarioSelecionado.id, permissoes);
      setSalvando('success');
      await new Promise((r) => setTimeout(r, 700));
      setSalvando('idle');
      setFuncionarioSelecionado(null);
      showToast('Permissões atualizadas.');
    } catch (err) {
      setSalvando('idle');
      showToast(err instanceof PermissoesApiError ? err.message : 'Erro ao salvar permissões.', 'error');
    }
  }

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
        <p className="text-text-secondary text-sm mt-1">Perfis de acesso e páginas liberadas para cada funcionário.</p>
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
                {e.perfil === 'ADMINISTRADOR' ? (
                  <span className="text-xs text-text-secondary w-[168px] text-right shrink-0">Acesso total</span>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => abrirPermissoes(e)}>
                    <Settings2 className="w-3.5 h-3.5" /> Gerenciar permissões
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        open={!!funcionarioSelecionado}
        onClose={() => setFuncionarioSelecionado(null)}
        title={funcionarioSelecionado ? `Permissões de ${funcionarioSelecionado.nome}` : 'Permissões'}
      >
        {permissoes === null ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-text-secondary">
              Páginas desmarcadas ficam ocultas no menu e bloqueadas mesmo por link direto.
            </p>
            <ul className="space-y-1 max-h-[360px] overflow-y-auto">
              {permissoes.map((p) => (
                <li key={p.pagina}>
                  <label className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-cream cursor-pointer">
                    <input
                      type="checkbox"
                      checked={p.permitido}
                      onChange={() => alternarPagina(p.pagina)}
                      className="w-4 h-4 rounded border-border text-navy focus:ring-gold/40 accent-navy"
                    />
                    <span className="text-sm text-navy">{PAGINA_LABEL[p.pagina] ?? p.pagina}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setFuncionarioSelecionado(null)}>
                Cancelar
              </Button>
              <Button type="button" status={salvando} onClick={handleSalvar}>
                {salvando === 'success' ? 'Salvo' : 'Salvar permissões'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
