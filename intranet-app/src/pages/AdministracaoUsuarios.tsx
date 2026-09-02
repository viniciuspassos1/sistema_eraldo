import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { fetchFuncionarios, FuncionariosApiError } from '../api/funcionarios';
import { fetchTodasPermissoes, salvarPermissoes, PermissoesApiError } from '../api/permissoes';
import type { User } from '../types';

const perfilTone = {
  ADMINISTRADOR: 'gold',
  GESTOR: 'navy',
  FUNCIONARIO: 'neutral',
} as const;

const PAGINAS: { chave: string; label: string }[] = [
  { chave: 'dashboard', label: 'Início' },
  { chave: 'meu-authenticator', label: 'Authenticator' },
  { chave: 'assistente-ia', label: 'Assistente IA' },
  { chave: 'base-conhecimento', label: 'Base de Conhecimento' },
  { chave: 'calendario', label: 'Calendário' },
  { chave: 'manual', label: 'Manual Interno' },
  { chave: 'documentos', label: 'Documentos' },
  { chave: 'cooperativa-ideias', label: 'Cooperativa' },
  { chave: 'tribunais', label: 'Tribunais' },
  { chave: 'solicitacoes', label: 'Solicitações' },
  { chave: 'notificacoes', label: 'Notificações' },
];

export function AdministracaoUsuarios() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<User[] | null>(null);
  const [permissoes, setPermissoes] = useState<Record<string, Record<string, boolean>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [salvandoCelula, setSalvandoCelula] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchFuncionarios(), fetchTodasPermissoes()])
      .then(([funcionarios, todasPermissoes]) => {
        setEmployees(funcionarios);
        setPermissoes(todasPermissoes);
      })
      .catch((err) =>
        setError(
          err instanceof FuncionariosApiError || err instanceof PermissoesApiError
            ? err.message
            : 'Erro inesperado ao carregar usuários e permissões.'
        )
      );
  }, []);

  async function alternar(usuarioId: string, pagina: string) {
    const anterior = permissoes;
    const novoValor = !(permissoes?.[usuarioId]?.[pagina] ?? true);

    setPermissoes((prev) => ({
      ...prev,
      [usuarioId]: { ...prev?.[usuarioId], [pagina]: novoValor },
    }));
    setSalvandoCelula(`${usuarioId}:${pagina}`);

    try {
      await salvarPermissoes(usuarioId, [{ pagina, permitido: novoValor }]);
    } catch (err) {
      setPermissoes(anterior);
      showToast(err instanceof PermissoesApiError ? err.message : 'Erro ao salvar permissão.', 'error');
    } finally {
      setSalvandoCelula(null);
    }
  }

  return (
    <div className="max-w-full space-y-6">
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
        <p className="text-text-secondary text-sm mt-1">
          Marque ou desmarque pra liberar/tirar o acesso à página na hora — cada clique salva sozinho.
        </p>
      </div>

      {error ? (
        <Card>
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar os usuários" description={error} />
        </Card>
      ) : employees === null || permissoes === null ? (
        <Card padded={false}>
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card>
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="text-sm border-collapse">
              <thead>
                <tr className="text-left text-xs text-text-secondary border-b border-border">
                  <th className="px-4 py-3 font-medium sticky left-0 bg-white">Funcionário</th>
                  <th className="px-3 py-3 font-medium whitespace-nowrap">Setor</th>
                  {PAGINAS.map((p) => (
                    <th key={p.chave} className="px-3 py-3 font-medium text-center whitespace-nowrap">
                      {p.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => {
                  const isAdmin = e.perfil === 'ADMINISTRADOR';
                  const linha = permissoes[e.id] ?? {};
                  return (
                    <tr key={e.id} className="border-b border-border last:border-0 hover:bg-cream/60">
                      <td className="px-4 py-3 sticky left-0 bg-white">
                        <div className="flex items-center gap-2.5 min-w-[180px]">
                          <Avatar nome={e.nome} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-navy truncate">{e.nome}</p>
                            <Badge tone={perfilTone[e.perfil]}>{e.perfil}</Badge>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-text-secondary whitespace-nowrap">{e.setor}</td>
                      {PAGINAS.map((p) => {
                        const marcado = isAdmin ? true : (linha[p.chave] ?? true);
                        const salvandoEssa = salvandoCelula === `${e.id}:${p.chave}`;
                        return (
                          <td key={p.chave} className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={marcado}
                              disabled={isAdmin || salvandoEssa}
                              onChange={() => alternar(e.id, p.chave)}
                              className="w-4 h-4 rounded border-border text-navy focus:ring-gold/40 accent-navy disabled:opacity-40"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
