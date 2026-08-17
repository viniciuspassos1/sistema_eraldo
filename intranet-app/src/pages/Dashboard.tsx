import { useNavigate } from 'react-router-dom';
import { Scale, Palmtree, Megaphone, Cake, Bot, Link2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { hearings } from '../mocks/hearings';
import { employees } from '../mocks/employees';
import { vacations } from '../mocks/vacations';
import { announcements } from '../mocks/announcements';
import { agendaEvents } from '../mocks/agenda';
import { greeting, formatDate } from '../utils/format';
import { todayISO, daysUntilNextOccurrence } from '../utils/date';
import { buildTrend } from '../utils/trend';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = todayISO();

  const nomePrimeiro = user?.nome.split(' ')[0] ?? '';

  // Personalizado por quem está logado — cada pessoa vê as suas audiências e sua agenda, não a do escritório inteiro.
  const minhasAudiencias = hearings.filter(
    (h) => h.advogado === user?.nome && h.data >= today && h.status === 'AGENDADA'
  );
  const funcionariosFerias = employees.filter((e) => e.status === 'FERIAS');
  const avisosNaoLidos = announcements.filter((a) => !a.lido);
  const aniversariantesProximos = employees.filter((e) => daysUntilNextOccurrence(e.aniversario) <= 30);
  const aniversarianteHoje = employees.find((e) => daysUntilNextOccurrence(e.aniversario) === 0);

  const minhaFerias = vacations.find((v) => v.funcionarioId === user?.id && v.status !== 'CONCLUIDA');

  const minhaAgendaHoje = agendaEvents
    .filter((e) => e.data === today && e.responsavel === user?.nome)
    .sort((a, b) => a.horario.localeCompare(b.horario));

  const avisosRecentes = [...announcements].sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 3);

  const shortcuts = [
    { label: 'Perguntar à IA', icon: Bot, path: '/assistente-ia' },
    { label: 'Audiências', icon: Scale, path: '/audiencias' },
    { label: 'Tribunais', icon: Link2, path: '/tribunais' },
    { label: 'Férias', icon: Palmtree, path: '/calendario?tab=ferias' },
  ];

  return (
    <div className="stagger-fade space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold text-navy">
          {greeting()}, {nomePrimeiro}. 👋
        </h1>
        <p className="text-text-secondary text-sm mt-1">Aqui está o que é seu para hoje.</p>
      </div>

      {aniversarianteHoje && (
        <div className="flex items-center gap-3 bg-gold/10 border border-gold/30 rounded-xl px-5 py-3.5">
          <Cake className="w-5 h-5 text-[#8a6d34] shrink-0" />
          <p className="text-sm text-navy">
            <span className="font-medium">Hoje é aniversário de {aniversarianteHoje.nome}!</span> Não esqueça de parabenizar.
          </p>
        </div>
      )}

      {minhaFerias && (
        <div className="flex items-center gap-3 bg-navy/5 border border-navy/15 rounded-xl px-5 py-3.5">
          <Palmtree className="w-5 h-5 text-navy shrink-0" />
          <p className="text-sm text-navy">
            {minhaFerias.status === 'EM_ANDAMENTO' ? (
              <span className="font-medium">Você está de férias até {formatDate(minhaFerias.fim)}.</span>
            ) : (
              <span className="font-medium">
                Suas férias começam em {formatDate(minhaFerias.inicio)} e vão até {formatDate(minhaFerias.fim)}.
              </span>
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Scale}
          label="Minhas audiências próximas"
          value={minhasAudiencias.length}
          countDelay={0}
          trend={buildTrend(minhasAudiencias.length, 1)}
        />
        <StatCard
          icon={Palmtree}
          label="Funcionários de férias"
          value={funcionariosFerias.length}
          countDelay={60}
          trend={buildTrend(funcionariosFerias.length, 2)}
        />
        <StatCard
          icon={Megaphone}
          label="Avisos não lidos"
          value={avisosNaoLidos.length}
          tone="gold"
          countDelay={120}
          trend={buildTrend(avisosNaoLidos.length, 3)}
        />
        <StatCard
          icon={Cake}
          label="Aniversariantes próximos"
          value={aniversariantesProximos.length}
          countDelay={180}
          trend={buildTrend(aniversariantesProximos.length, 4)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Minha agenda de hoje" />
          {minhaAgendaHoje.length === 0 ? (
            <EmptyState title="Você não tem compromissos hoje" description="Sua agenda está livre por enquanto." />
          ) : (
            <ul className="space-y-3">
              {minhaAgendaHoje.map((ev) => (
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
              <button onClick={() => navigate('/calendario?tab=avisos')} className="text-xs text-gold font-medium hover:underline">
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

      <div>
        <Card>
          <CardHeader title="Atalhos rápidos" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {shortcuts.map((s) => (
              <button
                key={s.path}
                onClick={() => navigate(s.path)}
                className="flex flex-col items-center gap-2 rounded-xl border border-border py-5 hover:border-gold/50 hover:bg-gold/5 hover:scale-[1.015] transition-[background-color,border-color,transform] duration-200"
              >
                <s.icon className="w-5 h-5 text-navy" strokeWidth={1.75} />
                <span className="text-xs text-navy font-medium text-center px-2">{s.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
