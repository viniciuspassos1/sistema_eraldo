import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ShieldAlert, Plus, Pencil, UserX, UserCheck } from 'lucide-react';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import {
  fetchFuncionarios,
  criarFuncionario,
  editarFuncionario,
  atualizarStatusFuncionario,
  FuncionariosApiError,
} from '../api/funcionarios';
import {
  fetchPaginasPermissao,
  fetchTodasPermissoes,
  salvarPermissoes,
  PermissoesApiError,
  type PaginaPermissao,
} from '../api/permissoes';
import type { User } from '../types';

const perfilTone = {
  ADMINISTRADOR: 'gold',
  GESTOR: 'navy',
  FUNCIONARIO: 'neutral',
} as const;

const FORM_VAZIO = {
  nome: '',
  email: '',
  senhaInicial: '',
  cargo: '',
  setor: '',
  perfil: 'FUNCIONARIO' as User['perfil'],
  dataEntrada: '',
  aniversario: '',
  telefone: '',
};

export function AdministracaoUsuarios() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<User[] | null>(null);
  const [permissoes, setPermissoes] = useState<Record<string, Record<string, boolean>> | null>(null);
  const [paginas, setPaginas] = useState<PaginaPermissao[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [salvandoCelula, setSalvandoCelula] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvandoForm, setSalvandoForm] = useState<'idle' | 'loading'>('idle');

  function carregar() {
    return Promise.all([fetchFuncionarios(), fetchTodasPermissoes(), fetchPaginasPermissao()])
      .then(([funcionarios, todasPermissoes, todasPaginas]) => {
        setEmployees(funcionarios);
        setPermissoes(todasPermissoes);
        setPaginas(todasPaginas);
      })
      .catch((err) =>
        setError(
          err instanceof FuncionariosApiError || err instanceof PermissoesApiError
            ? err.message
            : 'Erro inesperado ao carregar usuários e permissões.'
        )
      );
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(e: User) {
    setEditandoId(e.id);
    setForm({
      nome: e.nome,
      email: e.email,
      senhaInicial: '',
      cargo: e.cargo,
      setor: e.setor,
      perfil: e.perfil,
      dataEntrada: e.dataEntrada,
      aniversario: e.aniversario,
      telefone: e.telefone ?? '',
    });
    setModalAberto(true);
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setSalvandoForm('loading');
    try {
      if (editandoId) {
        await editarFuncionario(editandoId, {
          nome: form.nome,
          cargo: form.cargo,
          setor: form.setor,
          perfil: form.perfil,
          telefone: form.telefone || undefined,
        });
        showToast('Funcionário atualizado.');
      } else {
        await criarFuncionario({
          nome: form.nome,
          email: form.email,
          senhaInicial: form.senhaInicial,
          cargo: form.cargo,
          setor: form.setor,
          perfil: form.perfil,
          dataEntrada: form.dataEntrada,
          aniversario: form.aniversario,
          telefone: form.telefone || undefined,
        });
        showToast('Funcionário cadastrado.');
      }
      setModalAberto(false);
      await carregar();
    } catch (err) {
      showToast(err instanceof FuncionariosApiError ? err.message : 'Erro ao salvar funcionário.', 'error');
    } finally {
      setSalvandoForm('idle');
    }
  }

  async function alternarStatus(e: User) {
    const novoStatus = e.status === 'INATIVO' ? 'ATIVO' : 'INATIVO';
    try {
      await atualizarStatusFuncionario(e.id, novoStatus);
      showToast(novoStatus === 'INATIVO' ? 'Funcionário desativado.' : 'Funcionário reativado.');
      await carregar();
    } catch (err) {
      showToast(err instanceof FuncionariosApiError ? err.message : 'Erro ao atualizar status.', 'error');
    }
  }

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

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-gold" /> Usuários e Permissões
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Marque ou desmarque pra liberar/tirar o acesso à página na hora — cada clique salva sozinho.
          </p>
        </div>
        <Button size="sm" onClick={abrirNovo}>
          <Plus className="w-4 h-4" /> Novo funcionário
        </Button>
      </div>

      {error ? (
        <Card>
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar os usuários" description={error} />
        </Card>
      ) : employees === null || permissoes === null || paginas === null ? (
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
                  {paginas.map((p) => (
                    <th key={p.chave} className="px-3 py-3 font-medium text-center whitespace-nowrap">
                      {p.label}
                    </th>
                  ))}
                  <th className="px-3 py-3 font-medium text-right whitespace-nowrap">Ações</th>
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
                      {paginas.map((p) => {
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
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => abrirEdicao(e)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-cream hover:text-navy transition-colors"
                            aria-label={`Editar ${e.nome}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {!isAdmin && (
                            <button
                              onClick={() => alternarStatus(e)}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                                e.status === 'INATIVO'
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-rose-600 hover:bg-rose-50'
                              }`}
                              aria-label={e.status === 'INATIVO' ? `Reativar ${e.nome}` : `Desativar ${e.nome}`}
                              title={e.status === 'INATIVO' ? 'Reativar' : 'Desativar'}
                            >
                              {e.status === 'INATIVO' ? (
                                <UserCheck className="w-3.5 h-3.5" />
                              ) : (
                                <UserX className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        title={editandoId ? 'Editar funcionário' : 'Novo funcionário'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button status={salvandoForm} onClick={salvar} disabled={!form.nome.trim() || !form.cargo.trim() || !form.setor.trim()}>
              Salvar
            </Button>
          </>
        }
      >
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Nome</label>
            <input
              value={form.nome}
              onChange={(ev) => setForm((f) => ({ ...f, nome: ev.target.value }))}
              required
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          {!editandoId && (
            <>
              <div>
                <label className="block text-xs font-medium text-navy mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(ev) => setForm((f) => ({ ...f, email: ev.target.value }))}
                  required
                  className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy mb-1.5">Senha inicial</label>
                <input
                  type="text"
                  value={form.senhaInicial}
                  onChange={(ev) => setForm((f) => ({ ...f, senhaInicial: ev.target.value }))}
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-navy mb-1.5">Data de entrada</label>
                  <input
                    type="date"
                    value={form.dataEntrada}
                    onChange={(ev) => setForm((f) => ({ ...f, dataEntrada: ev.target.value }))}
                    required
                    className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy mb-1.5">Aniversário</label>
                  <input
                    type="date"
                    value={form.aniversario}
                    onChange={(ev) => setForm((f) => ({ ...f, aniversario: ev.target.value }))}
                    required
                    className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
                  />
                </div>
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Cargo</label>
              <input
                value={form.cargo}
                onChange={(ev) => setForm((f) => ({ ...f, cargo: ev.target.value }))}
                required
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Setor</label>
              <input
                value={form.setor}
                onChange={(ev) => setForm((f) => ({ ...f, setor: ev.target.value }))}
                required
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Perfil</label>
              <select
                value={form.perfil}
                onChange={(ev) => setForm((f) => ({ ...f, perfil: ev.target.value as User['perfil'] }))}
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              >
                <option value="FUNCIONARIO">Funcionário</option>
                <option value="GESTOR">Gestor</option>
                <option value="ADMINISTRADOR">Administrador</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Telefone</label>
              <input
                value={form.telefone}
                onChange={(ev) => setForm((f) => ({ ...f, telefone: ev.target.value }))}
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
