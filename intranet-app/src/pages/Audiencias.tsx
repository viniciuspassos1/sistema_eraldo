import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Scale } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { hearings } from '../mocks/hearings';
import { formatDate } from '../utils/format';
import { todayISO } from '../utils/date';
import { useReducedMotion } from '../hooks/useReducedMotion';

type FiltroPeriodo = 'todos' | 'hoje' | 'amanha' | 'semana' | 'mes';

const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  AGENDADA: 'warning',
  REALIZADA: 'success',
  CANCELADA: 'danger',
  REMARCADA: 'neutral',
};

export function Audiencias() {
  const { user } = useAuth();
  const advogados = useMemo(() => Array.from(new Set(hearings.map((h) => h.advogado))), []);
  const souAdvogado = !!user && advogados.includes(user.nome);

  const [periodo, setPeriodo] = useState<FiltroPeriodo>('todos');
  const [advogado, setAdvogado] = useState(souAdvogado ? user!.nome : 'todos');
  const [busca, setBusca] = useState('');
  const reduceMotion = useReducedMotion();

  const today = new Date(todayISO());
  const filtradas = hearings.filter((h) => {
    const data = new Date(h.data);
    const diffDias = Math.round((data.getTime() - today.getTime()) / 86400000);

    if (periodo === 'hoje' && diffDias !== 0) return false;
    if (periodo === 'amanha' && diffDias !== 1) return false;
    if (periodo === 'semana' && (diffDias < 0 || diffDias > 7)) return false;
    if (periodo === 'mes' && (diffDias < 0 || diffDias > 31)) return false;
    if (advogado !== 'todos' && h.advogado !== advogado) return false;
    if (busca && !`${h.processo} ${h.cliente}`.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <Scale className="w-5 h-5 text-gold" /> Audiências
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          {souAdvogado && advogado === user!.nome
            ? 'Suas audiências agendadas.'
            : 'Acompanhe as audiências agendadas do escritório.'}
        </p>
      </div>

      {souAdvogado && (
        <div className="flex gap-1 bg-white border border-border rounded-lg p-1 w-fit">
          <button
            onClick={() => setAdvogado(user!.nome)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ${
              advogado === user!.nome ? 'bg-navy text-white' : 'text-text-secondary hover:text-navy'
            }`}
          >
            Minhas audiências
          </button>
          <button
            onClick={() => setAdvogado('todos')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ${
              advogado === 'todos' ? 'bg-navy text-white' : 'text-text-secondary hover:text-navy'
            }`}
          >
            Todo o escritório
          </button>
        </div>
      )}

      <Card padded={false} className="p-4 flex flex-col sm:flex-row gap-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por processo ou cliente..."
          className="flex-1 bg-cream border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
        />
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as FiltroPeriodo)}
          className="bg-cream border border-border rounded-lg px-3.5 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
        >
          <option value="todos">Todos os períodos</option>
          <option value="hoje">Hoje</option>
          <option value="amanha">Amanhã</option>
          <option value="semana">Esta semana</option>
          <option value="mes">Este mês</option>
        </select>
        <select
          value={advogado}
          onChange={(e) => setAdvogado(e.target.value)}
          className="bg-cream border border-border rounded-lg px-3.5 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
        >
          <option value="todos">Todos os advogados</option>
          {advogados.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </Card>

      <Card padded={false}>
        {filtradas.length === 0 ? (
          <EmptyState
            icon={Scale}
            title="Você não possui audiências cadastradas para este período."
            description="Ajuste os filtros ou aguarde novos agendamentos."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-secondary border-b border-border">
                  <th className="px-5 py-3 font-medium">Processo</th>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium">Advogado</th>
                  <th className="px-5 py-3 font-medium">Data / Hora</th>
                  <th className="px-5 py-3 font-medium">Local</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((h, i) => (
                  <motion.tr
                    key={h.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: reduceMotion ? 0 : 0.15, delay: reduceMotion ? 0 : i * 0.02 }}
                    className="border-b border-border last:border-0 hover:bg-cream/60 transition-colors duration-150"
                  >
                    <td className="px-5 py-3.5 text-navy font-medium whitespace-nowrap">{h.processo}</td>
                    <td className="px-5 py-3.5 text-navy whitespace-nowrap">{h.cliente}</td>
                    <td className="px-5 py-3.5 text-text-secondary whitespace-nowrap">{h.advogado}</td>
                    <td className="px-5 py-3.5 text-text-secondary whitespace-nowrap">
                      {formatDate(h.data)} às {h.horario}
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary whitespace-nowrap">{h.local}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone={statusTone[h.status]}>{h.status}</Badge>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
