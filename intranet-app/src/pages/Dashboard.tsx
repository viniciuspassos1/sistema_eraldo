import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palmtree, Megaphone, Cake, Bot, FileText, Link2, ShieldAlert, GraduationCap, Inbox as InboxIcon, Stethoscope, Lightbulb, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { fetchFuncionarios, FuncionariosApiError } from '../api/funcionarios';
import { fetchFerias } from '../api/ferias';
import { fetchAvisos } from '../api/avisos';
import { fetchAgendaEventos } from '../api/agenda';
import { fetchPendencias, type Pendencia } from '../api/pendencias';
import { greeting, formatDate } from '../utils/format';
import { todayISO, daysUntilNextOccurrence } from '../utils/date';
import type { User, Vacation, Announcement, AgendaEvent } from '../types';

const pendenciaIcon = {
  ONBOARDING: GraduationCap,
  SOLICITACAO: InboxIcon,
  ATESTADO: Stethoscope,
  IDEIA: Lightbulb,
} as const;

interface DashboardDados {
  funcionarios: User[];
  ferias: Vacation[];
  avisos: Announcement[];
  agenda: AgendaEvent[];
  pendencias: Pendencia[];
}

const shortcuts = [
  { label: 'Perguntar à IA', icon: Bot, path: '/assistente-ia' },
  { label: 'Documentos', icon: FileText, path: '/documentos' },
  { label: 'Tribunais', icon: Link2, path: '/tribunais' },
  { label: 'Férias', icon: Palmtree, path: '/calendario?tab=ferias' },
];

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = todayISO();

  const [dados, setDados] = useState<DashboardDados | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchFuncionarios(),
      fetchFerias(),
      fetchAvisos(),
      fetchAgendaEventos(),
      // Widget complementar: se falhar (ex.: backend antigo sem essa rota
      // ainda), o resto do dashboard continua funcionando normalmente.
      fetchPendencias().catch(() => []),
    ])
      .then(([funcionarios, ferias, avisos, agenda, pendencias]) => setDados({ funcionarios, ferias, avisos, agenda, pendencias }))
      .catch((err) => setErro(err instanceof FuncionariosApiError ? err.message : 'Erro inesperado ao carregar o dashboard.'));
  }, []);

  const nomePrimeiro = user?.nome.split(' ')[0] ?? '';

  if (erro) {
    return (
      <Card className="max-w-2xl">
        <EmptyState icon={ShieldAlert} title="Não foi possível carregar o dashboard" description={erro} />
      </Card>
    );
  }

  if (!dados) {
    return (
      <div className="space-y-6 max-w-6xl">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  const { funcionarios, ferias, avisos, agenda, pendencias } = dados;

  const funcionariosFerias = funcionarios.filter((f) => f.status === 'FERIAS');
  const avisosNaoLidos = avisos.filter((a) => !a.lido);
  const aniversariantesProximos = funcionarios.filter((f) => daysUntilNextOccurrence(f.aniversario) <= 30);
  const aniversarianteHoje = funcionarios.find((f) => daysUntilNextOccurrence(f.aniversario) === 0);

  const minhaFerias = ferias.find((v) => v.funcionarioId === user?.id && v.status !== 'CONCLUIDA');

  const minhaAgendaHoje = agenda
    .filter((e) => e.data === today && e.responsavel === user?.nome)
    .sort((a, b) => a.horario.localeCompare(b.horario));

  const avisosRecentes = [...avisos].sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 3);

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

      {pendencias.length > 0 && (
        <Card>
          <CardHeader title="Minhas pendências" />
          <ul className="divide-y divide-border -mt-1">
            {pendencias.map((p, i) => {
              const Icon = pendenciaIcon[p.tipo];
              return (
                <li key={i}>
                  <button
                    onClick={() => navigate(p.link)}
                    className="w-full flex items-center gap-3 py-3 text-left hover:bg-cream transition-colors duration-150 -mx-1 px-1 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-[#8a6d34]" strokeWidth={1.75} />
                    </div>
                    <span className="text-sm text-navy flex-1">{p.mensagem}</span>
                    <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Palmtree}
          label="Funcionários de férias"
          value={funcionariosFerias.length}
          countDelay={0}
        />
        <StatCard
          icon={Megaphone}
          label="Avisos não lidos"
          value={avisosNaoLidos.length}
          tone="gold"
          countDelay={60}
        />
        <StatCard
          icon={Cake}
          label="Aniversariantes próximos"
          value={aniversariantesProximos.length}
          countDelay={120}
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
