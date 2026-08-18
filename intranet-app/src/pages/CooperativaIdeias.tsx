import { useState, type FormEvent } from 'react';
import { Lightbulb, Plus } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { ideiasConteudo as seed } from '../mocks/ideias';
import type { IdeiaConteudo } from '../types';
import { formatDate } from '../utils/format';
import { todayISO } from '../utils/date';

const statusLabel: Record<IdeiaConteudo['status'], string> = {
  NOVA: 'Nova ideia',
  EM_ANALISE: 'Em análise',
  APROVADA: 'Aprovada',
  EM_PRODUCAO: 'Em produção',
  PUBLICADA: 'Publicada',
  NAO_APROVADA: 'Não aprovada',
};

const statusTone = {
  NOVA: 'neutral',
  EM_ANALISE: 'warning',
  APROVADA: 'navy',
  EM_PRODUCAO: 'gold',
  PUBLICADA: 'success',
  NAO_APROVADA: 'danger',
} as const;

const formatos = ['Post', 'Reels', 'Stories', 'Vídeo', 'Outro'];

const temas = [
  'Conteúdo educativo',
  'Advocacia',
  'Tema jurídico',
  'Data comemorativa',
  'Tendência/assunto em destaque',
  'Pergunta frequente de cliente',
  'Campanha',
  'Institucional',
  'Outro',
];

export function CooperativaIdeias() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [ideias, setIdeias] = useState<IdeiaConteudo[]>(seed);
  const [status, setStatus] = useState('todos');
  const [modalOpen, setModalOpen] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [formato, setFormato] = useState(formatos[0]);
  const [tema, setTema] = useState(temas[0]);
  const [referencia, setReferencia] = useState('');
  const [buttonStatus, setButtonStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const filtradas = ideias.filter((i) => status === 'todos' || i.status === status);

  function handleStatusChange(id: string, novoStatus: IdeiaConteudo['status']) {
    setIdeias((prev) => prev.map((i) => (i.id === id ? { ...i, status: novoStatus } : i)));
  }

  async function handleEnviarIdeia(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !descricao.trim()) return;

    setButtonStatus('loading');
    await new Promise((r) => setTimeout(r, 600));

    const nova: IdeiaConteudo = {
      id: crypto.randomUUID(),
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      formato,
      tema,
      referencia: referencia.trim() || undefined,
      autor: user?.nome ?? 'Você',
      data: todayISO(),
      status: 'NOVA',
    };
    setIdeias((prev) => [nova, ...prev]);
    setButtonStatus('success');

    await new Promise((r) => setTimeout(r, 700));
    setButtonStatus('idle');
    setModalOpen(false);
    setTitulo('');
    setDescricao('');
    setFormato(formatos[0]);
    setTema(temas[0]);
    setReferencia('');
    showToast('Ideia enviada para a Cooperativa de Ideias.');
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-gold" /> Cooperativa de Ideias
          </h1>
          <p className="text-text-secondary text-sm mt-1 max-w-2xl">
            Sugestões de conteúdo para as redes sociais do escritório — posts, reels, stories, vídeos e temas
            jurídicos. A equipe de marketing acompanha e organiza tudo por aqui.
          </p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" /> Nova ideia
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['todos', 'NOVA', 'EM_ANALISE', 'APROVADA', 'EM_PRODUCAO', 'PUBLICADA', 'NAO_APROVADA'] as const).map(
          (s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors duration-150 ${
                status === s ? 'bg-navy text-white border-navy' : 'border-border text-navy hover:bg-cream'
              }`}
            >
              {s === 'todos' ? 'Todas' : statusLabel[s]}
            </button>
          )
        )}
      </div>

      {filtradas.length === 0 ? (
        <Card>
          <EmptyState icon={Lightbulb} title="Nenhuma ideia encontrada" description="Que tal enviar a primeira?" />
        </Card>
      ) : (
        <div className="stagger-fade space-y-3">
          {filtradas.map((i) => (
            <Card key={i.id}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[240px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-navy">{i.titulo}</p>
                    <Badge tone="gold">{i.formato}</Badge>
                    <Badge tone="navy">{i.tema}</Badge>
                  </div>
                  <p className="text-sm text-navy mt-2 leading-relaxed">{i.descricao}</p>
                  {i.referencia && (
                    <p className="text-xs text-text-secondary mt-1.5 italic">Referência: {i.referencia}</p>
                  )}
                  <p className="text-xs text-text-secondary mt-2.5">
                    {i.autor} · {formatDate(i.data)}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Badge tone={statusTone[i.status]}>{statusLabel[i.status]}</Badge>
                  <select
                    value={i.status}
                    onChange={(e) => handleStatusChange(i.id, e.target.value as IdeiaConteudo['status'])}
                    className="text-xs bg-cream border border-border rounded-md px-2 py-1 text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
                  >
                    {(Object.keys(statusLabel) as IdeiaConteudo['status'][]).map((s) => (
                      <option key={s} value={s}>
                        {statusLabel[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova ideia de conteúdo">
        <form onSubmit={handleEnviarIdeia} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Título da ideia</label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              placeholder="Ex.: 5 erros que podem prejudicar uma ação trabalhista"
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Formato sugerido</label>
              <select
                value={formato}
                onChange={(e) => setFormato(e.target.value)}
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
              >
                {formatos.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1.5">Tema/categoria</label>
              <select
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
              >
                {temas.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Descrição do conteúdo</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              required
              placeholder="Explique a ideia: o que seria abordado, como e por quê."
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy mb-1.5">Referência ou exemplo (opcional)</label>
            <input
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Link, perfil ou exemplo parecido"
              className="w-full bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" status={buttonStatus} disabled={!titulo.trim() || !descricao.trim()}>
              {buttonStatus === 'success' ? 'Enviada' : 'Enviar ideia'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
