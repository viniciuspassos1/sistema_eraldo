import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useToast } from './Toast';
import { criarFuncionario, FuncionariosApiError } from '../api/funcionarios';
import type { User } from '../types';

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

type Props = {
  open: boolean;
  onClose: () => void;
  onCriado?: () => void;
};

export function CriarFuncionarioModal({ open, onClose, onCriado }: Props) {
  const { showToast } = useToast();
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvandoForm, setSalvandoForm] = useState<'idle' | 'loading'>('idle');

  function fechar() {
    setForm(FORM_VAZIO);
    onClose();
  }

  async function criarAcesso(ev: FormEvent) {
    ev.preventDefault();
    setSalvandoForm('loading');
    try {
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
      showToast('Acesso do novo funcionário criado.');
      fechar();
      onCriado?.();
    } catch (err) {
      showToast(err instanceof FuncionariosApiError ? err.message : 'Erro ao criar acesso do funcionário.', 'error');
    } finally {
      setSalvandoForm('idle');
    }
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      title="Criar acesso de novo funcionário"
      footer={
        <>
          <Button variant="outline" onClick={fechar}>
            Cancelar
          </Button>
          <Button
            status={salvandoForm}
            onClick={criarAcesso}
            disabled={!form.nome.trim() || !form.email.trim() || !form.senhaInicial || !form.cargo.trim() || !form.setor.trim() || !form.dataEntrada || !form.aniversario}
          >
            Criar acesso
          </Button>
        </>
      }
    >
      <form onSubmit={criarAcesso} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-navy mb-1.5">Nome</label>
          <input
            value={form.nome}
            onChange={(ev) => setForm((f) => ({ ...f, nome: ev.target.value }))}
            required
            className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
  );
}
