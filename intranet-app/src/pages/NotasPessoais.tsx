import { useEffect, useState, type FormEvent } from 'react';
import { NotebookPen, Search, Pencil, Trash2, ShieldAlert } from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { fetchNotas, criarNota, atualizarNota, apagarNota, NotasPessoaisApiError } from '../api/notasPessoais';
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

  return (
    <div className="max-w-3xl space-y-6">
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
        <div className="stagger-fade space-y-3">
          {filtradas.map((n) => (
            <Card key={n.id}>
              {editandoId === n.id ? (
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
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy">{n.titulo}</p>
                    <p className="text-sm text-navy mt-1.5 whitespace-pre-line">{n.conteudo}</p>
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
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
