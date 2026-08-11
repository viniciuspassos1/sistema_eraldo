import { useState } from 'react';
import { motion } from 'motion/react';
import { Megaphone } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { announcements as seed } from '../mocks/announcements';
import { formatDate } from '../utils/format';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { staggerContainer, fadeUpItem } from '../utils/motionVariants';

const prioridadeTone = {
  INFORMATIVO: 'neutral',
  URGENTE: 'danger',
  ADMINISTRATIVO: 'navy',
  JURIDICO: 'gold',
  TECNOLOGIA: 'warning',
} as const;

export function Avisos() {
  const [avisos, setAvisos] = useState(seed);
  const [filtro, setFiltro] = useState<'todos' | 'nao_lidos'>('todos');
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();
  const container = staggerContainer(0.05, 0, reduceMotion);
  const item = fadeUpItem(reduceMotion);

  const visiveis = avisos.filter((a) => filtro === 'todos' || !a.lido);

  function marcarLido(id: string) {
    const aviso = avisos.find((a) => a.id === id);
    setAvisos((prev) => prev.map((a) => (a.id === id ? { ...a, lido: true } : a)));
    if (aviso && !aviso.lido) showToast('Aviso marcado como lido.');
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-gold" /> Avisos
          </h1>
          <p className="text-text-secondary text-sm mt-1">Comunicados internos do escritório.</p>
        </div>
        <div className="flex gap-1 bg-white border border-border rounded-lg p-1">
          {(['todos', 'nao_lidos'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                filtro === f ? 'bg-navy text-white' : 'text-text-secondary'
              }`}
            >
              {f === 'todos' ? 'Todos' : 'Não lidos'}
            </button>
          ))}
        </div>
      </div>

      {visiveis.length === 0 ? (
        <Card>
          <EmptyState icon={Megaphone} title="Nenhum aviso por aqui" description="Você está em dia com os comunicados." />
        </Card>
      ) : (
        <motion.div className="space-y-3" variants={container} initial="hidden" animate="visible">
          {visiveis.map((a) => (
            <motion.div key={a.id} variants={item}>
              <Card interactive onClick={() => marcarLido(a.id)} className={!a.lido ? 'border-gold/40' : ''}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-navy">{a.titulo}</p>
                      <Badge tone={prioridadeTone[a.prioridade]}>{a.prioridade}</Badge>
                      {!a.lido && <Badge tone="gold">Não lido</Badge>}
                    </div>
                    <p className="text-sm text-text-secondary mt-2">{a.conteudo}</p>
                    <p className="text-xs text-text-secondary mt-3">
                      {a.autor} · {formatDate(a.data)} · {a.publico}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
