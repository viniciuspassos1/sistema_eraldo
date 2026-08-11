import { useNavigate } from 'react-router-dom';
import { Scale, Palmtree, Megaphone, Cake, Bot, FileText, Link2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { hearings } from '../mocks/hearings';
import { employees } from '../mocks/employees';
import { announcements } from '../mocks/announcements';
import { agendaEvents } from '../mocks/agenda';
import { greeting } from '../utils/format';
import { todayISO, daysUntilNextOccurrence } from '../utils/date';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = todayISO();

  const audienciasProximas = hearings.filter((h) => h.data >= today && h.status === 'AGENDADA');
  const funcionariosFerias = employees.filter((e) => e.status === 'FERIAS');
  const avisosNaoLidos = announcements.filter((a) => !a.lido);
  const aniversariantesProximos = employees.filter((e) => daysUntilNextOccurrence(e.aniversario) <= 30);
  const aniversarianteHoje = employees.find((e) => daysUntilNextOccurrence(e.aniversario) === 0);

  const agendaHoje = agendaEvents
    .filter((e) => e.data === today)
    .sort((a, b) => a.horario.localeCompare(b.horario));

  const avisosRecentes = [...announcements].sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 3);

  const shortcuts = [
    { label: 'Perguntar à IA', icon: Bot, path: '/assistente-ia' },
    { label: 'Audiências', icon: Scale, path: '/audiencias' },
    { label: 'Documentos', icon: FileText, path: '/documentos' },
    { label: 'Tribunais', icon: Link2, path: '/tribunais' },
    { label: 'Férias', icon: Palmtree, path: '/ferias' },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold text-navy">
          {greeting()}, {user?.nome.split(' ')[0]}. 👋
        </h1>
        <p className="text-text-secondary text-sm mt-1">Aqui está o que está acontecendo no escritório.</p>
      </div>

      {aniversarianteHoje && (
        <div className="flex items-center gap-3 bg-gold/10 border border-gold/30 rounded-xl px-5 py-3.5">
          <Cake className="w-5 h-5 text-[#8a6d34] shrink-0" />
          <p className="text-sm text-navy">
            <span className="font-medium">Hoje é aniversário de {aniversarianteHoje.nome}!</span> Não esqueça de parabenizar.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Scale} label="Audiências próximas" value={audienciasProximas.length} />
        <StatCard icon={Palmtree} label="Funcionários de férias" value={funcionariosFerias.length} />
        <StatCard icon={Megaphone} label="Avisos não lidos" value={avisosNaoLidos.length} tone="gold" />
        <StatCard icon={Cake} label="Aniversariantes próximos" value={aniversariantesProximos.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Agenda de hoje" />
          {agendaHoje.length === 0 ? (
            <EmptyState title="Nenhum compromisso para hoje" description="Sua agenda está livre por enquanto." />
          ) : (
            <ul className="space-y-3">
              {agendaHoje.map((ev) => (
                <li key={ev.id} className="flex gap-4">
                  <span className="text-sm font-semibold text-navy w-12 shrink-0">{ev.horario}</span>
                  <div className="flex-1 border-l border-border pl-4">
                    <p className="text-sm text-navy">{ev.titulo}</p>
                    {ev.local && <p className="text-xs text-text-secondary mt-0.5">{ev.local}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Avisos recentes"
            action={
              <button onClick={() => navigate('/avisos')} className="text-xs text-gold font-medium hover:underline">
                Ver todos
              </button>
            }
          />
          {avisosRecentes.length === 0 ? (
            <EmptyState title="Nenhum aviso publicado" />
          ) : (
            <ul className="space-y-3">
              {avisosRecentes.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-navy">{a.titulo}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{a.autor}</p>
                  </div>
                  {!a.lido && <Badge tone="gold">Novo</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Atalhos rápidos" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {shortcuts.map((s) => (
            <button
              key={s.path}
              onClick={() => navigate(s.path)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border py-5 hover:border-gold/50 hover:bg-gold/5 transition-colors"
            >
              <s.icon className="w-5 h-5 text-navy" strokeWidth={1.75} />
              <span className="text-xs text-navy font-medium text-center px-2">{s.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
