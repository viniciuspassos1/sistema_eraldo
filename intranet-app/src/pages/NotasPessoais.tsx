import { useEffect, useState, type FormEvent, type DragEvent } from 'react';
import { NotebookPen, Search, Pencil, Trash2, ShieldAlert, Check, Circle, CheckCircle2, GripVertical } from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { fetchNotas, criarNota, atualizarNota, apagarNota, alternarConcluida, NotasPessoaisApiError } from '../api/notasPessoais';
import type { NotaPessoal } from '../types';
import { formatDateTime } from '../utils/format';

export function NotasPessoais() {
  const { showToast } = useToast();
  const [notas, setNotas] = useState<NotaPessoal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [tituloEdicao, setTituloEdicao] = useState('');
  const [conteudoEdicao, setConteudoEdicao] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<'pendentes' | 'concluidas' | null>(null);

  useEffect(() => {
    fetchNotas()
      .then(setNotas)
      .catch((err) => setError(err instanceof NotasPessoaisApiError ? err.message : 'Erro inesperado ao carregar as anotações.'));
  }, []);

  const filtradas = (notas ?? []).filter((n) => {
    const alvo = busca.trim().toLowerCase();
    if (!alvo) return true;
    return n.titulo.toLowerCase().includes(alvo) || n.conteudo.toLowerCase().includes(alvo);
  });

  const pendentes = filtradas.filter((n) => !n.concluida);
  const concluidas = filtradas.filter((n) => n.concluida);

  async function handleCriar(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) return;

    setSalvando(true);
    try {
      const nova = await criarNota(titulo.trim(), conteudo.trim());
      setNotas((prev) => [nova, ...(prev ?? [])]);
      setTitulo('');
      setConteudo('');
      showToast('Anotação salva.');
    } catch (err) {
      showToast(err instanceof NotasPessoaisApiError ? err.message : 'Erro ao salvar a anotação.', 'error');
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(nota: NotaPessoal) {
    setEditandoId(nota.id);
    setTituloEdicao(nota.titulo);
    setConteudoEdicao(nota.conteudo);
  }

  async function handleSalvarEdicao(id: string) {
    if (!tituloEdicao.trim() || !conteudoEdicao.trim()) return;

    setSalvandoEdicao(true);
    try {
      const atualizada = await atualizarNota(id, tituloEdicao.trim(), conteudoEdicao.trim());
      setNotas((prev) => (prev ?? []).map((n) => (n.id === id ? atualizada : n)));
      setEditandoId(null);
      showToast('Anotação atualizada.');
    } catch (err) {
      showToast(err instanceof NotasPessoaisApiError ? err.message : 'Erro ao atualizar a anotação.', 'error');
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function handleApagar(id: string) {
    const anterior = notas;
    setNotas((prev) => (prev ?? []).filter((n) => n.id !== id));
    try {
      await apagarNota(id);
      showToast('Anotação apagada.');
    } catch (err) {
      setNotas(anterior ?? null);
      showToast(err instanceof NotasPessoaisApiError ? err.message : 'Erro ao apagar a anotação.', 'error');
    }
  }

  async function handleDefinirConcluida(id: string, concluida: boolean) {
    const anterior = notas;
    const atual = (notas ?? []).find((n) => n.id === id);
    if (!atual || atual.concluida === concluida) return;

    setNotas((prev) => (prev ?? []).map((n) => (n.id === id ? { ...n, concluida } : n)));
    try {
      await alternarConcluida(id, concluida);
    } catch (err) {
      setNotas(anterior ?? null);
      showToast(err instanceof NotasPessoaisApiError ? err.message : 'Erro ao atualizar a anotação.', 'error');
    }
  }

  function handleDropNaColuna(e: DragEvent, coluna: 'pendentes' | 'concluidas') {
    e.preventDefault();
    setColunaAlvo(null);
    const id = e.dataTransfer.getData('text/plain');
    if (id) handleDefinirConcluida(id, coluna === 'concluidas');
  }

  function renderNota(n: NotaPessoal) {
    if (editandoId === n.id) {
      return (
        <Card key={n.id}>
          <div className="space-y-3">
            <input
              value={tituloEdicao}
              onChange={(e) => setTituloEdicao(e.target.value)}
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
            />
            <textarea
              value={conteudoEdicao}
              onChange={(e) => setConteudoEdicao(e.target.value)}
              rows={3}
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150 resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditandoId(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                loading={salvandoEdicao}
                disabled={!tituloEdicao.trim() || !conteudoEdicao.trim()}
                onClick={() => handleSalvarEdicao(n.id)}
              >
                Salvar
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card
        key={n.id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', n.id);
          e.dataTransfer.effectAllowed = 'move';
          setArrastandoId(n.id);
        }}
        onDragEnd={() => setArrastandoId(null)}
        className={`cursor-grab active:cursor-grabbing transition-[opacity,background-color] duration-150 ${
          arrastandoId === n.id ? 'opacity-40' : ''
        } ${n.concluida ? 'bg-cream! border-border/60' : 'bg-white! border-border shadow-soft'}`}
      >
        <div className="flex items-start gap-3">
          <GripVertical className="w-3.5 h-3.5 text-text-secondary/40 mt-1 shrink-0" />
          <button
            onClick={() => handleDefinirConcluida(n.id, !n.concluida)}
            className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-colors duration-150 ${
              n.concluida ? 'bg-navy border-navy' : 'border-border hover:border-navy/40'
            }`}
            aria-label={n.concluida ? 'Marcar como pendente' : 'Marcar como concluída'}
          >
            {n.concluida && <Check className="w-3.5 h-3.5 text-white" />}
          </button>

          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${n.concluida ? 'text-text-secondary line-through' : 'text-navy'}`}>{n.titulo}</p>
            <p className={`text-sm mt-1.5 whitespace-pre-line ${n.concluida ? 'text-text-secondary line-through' : 'text-navy'}`}>
              {n.conteudo}
            </p>
            <p className="text-xs text-text-secondary mt-2.5">Atualizada em {formatDateTime(n.atualizadoEm)}</p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => iniciarEdicao(n)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-cream text-text-secondary hover:text-navy transition-colors duration-150"
              aria-label="Editar anotação"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleApagar(n.id)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-50 text-text-secondary hover:text-rose-600 transition-colors duration-150"
              aria-label="Apagar anotação"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <NotebookPen className="w-5 h-5 text-gold" /> Anotações
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Seu espaço pessoal pra registrar lembretes e observações — só você vê o que escreve aqui.
        </p>
      </div>

      <Card>
        <CardHeader title="Nova anotação" />
        <form onSubmit={handleCriar} className="space-y-3">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título"
            className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
          />
          <textarea
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            rows={3}
            placeholder="Escreva sua anotação..."
            className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150 resize-none"
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={salvando} disabled={!titulo.trim() || !conteudo.trim()}>
              Salvar anotação
            </Button>
          </div>
        </form>
      </Card>

      {notas !== null && notas.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar nas suas anotações..."
            className="w-full bg-white border border-border rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-navy placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
          />
        </div>
      )}

      {error ? (
        <Card>
          <EmptyState icon={ShieldAlert} title="Não foi possível carregar as anotações" description={error} />
        </Card>
      ) : notas === null ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-full" />
            </Card>
          ))}
        </div>
      ) : notas.length === 0 ? (
        <Card>
          <EmptyState icon={NotebookPen} title="Nenhuma anotação ainda" description="Escreva a primeira ali em cima." />
        </Card>
      ) : filtradas.length === 0 ? (
        <Card>
          <EmptyState icon={Search} title="Nada encontrado" description="Tente buscar por outro termo." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setColunaAlvo('pendentes');
            }}
            onDragLeave={() => setColunaAlvo((c) => (c === 'pendentes' ? null : c))}
            onDrop={(e) => handleDropNaColuna(e, 'pendentes')}
            className={`space-y-3 rounded-xl transition-[outline] duration-150 ${
              colunaAlvo === 'pendentes' ? 'outline outline-2 outline-gold/50 outline-offset-4' : ''
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-navy uppercase tracking-wide px-1">
              <Circle className="w-3.5 h-3.5 text-gold" /> Pendentes ({pendentes.length})
            </div>
            {pendentes.length === 0 ? (
              <Card>
                <EmptyState icon={Circle} title="Nada pendente" description="Arraste uma anotação concluída pra cá se precisar reabrir." />
              </Card>
            ) : (
              <div className="stagger-fade space-y-3">{pendentes.map(renderNota)}</div>
            )}
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setColunaAlvo('concluidas');
            }}
            onDragLeave={() => setColunaAlvo((c) => (c === 'concluidas' ? null : c))}
            onDrop={(e) => handleDropNaColuna(e, 'concluidas')}
            className={`space-y-3 rounded-xl transition-[outline] duration-150 ${
              colunaAlvo === 'concluidas' ? 'outline outline-2 outline-emerald-500/50 outline-offset-4' : ''
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-navy uppercase tracking-wide px-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Concluídas ({concluidas.length})
            </div>
            {concluidas.length === 0 ? (
              <Card>
                <EmptyState icon={CheckCircle2} title="Nada concluído ainda" description="Arraste uma anotação pra cá quando terminar." />
              </Card>
            ) : (
              <div className="stagger-fade space-y-3">{concluidas.map(renderNota)}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
