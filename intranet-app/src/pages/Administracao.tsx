import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Palmtree,
  Calendar,
  Cake,
  CalendarDays,
  Megaphone,
  BookOpen,
  FileText,
  Lightbulb,
  UserPlus,
  Link2,
  ShieldCheck,
  Inbox,
  ShieldAlert,
  ScrollText,
} from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { fetchFuncionarios, FuncionariosApiError } from '../api/funcionarios';
import { fetchFerias } from '../api/ferias';
import { fetchSolicitacoes } from '../api/solicitacoes';
import { fetchDocumentos } from '../api/documentos';
import { fetchIdeias } from '../api/cooperativaIdeias';
import { fetchAvisos } from '../api/avisos';
import { isSameMonth } from '../utils/date';
import type { User, Vacation, Request, DocumentItem, IdeiaConteudo, Announcement } from '../types';

interface AdministracaoDados {
  funcionarios: User[];
  ferias: Vacation[];
  solicitacoes: Request[];
  documentos: DocumentItem[];
  ideias: IdeiaConteudo[];
  avisos: Announcement[];
}

const modules = [
  { label: 'Funcionários', icon: Users, path: '/calendario?tab=funcionarios' },
  { label: 'Usuários e permissões', icon: ShieldCheck, path: '/administracao/usuarios' },
  { label: 'Férias', icon: Palmtree, path: '/calendario?tab=ferias' },
  { label: 'Agenda', icon: Calendar, path: '/calendario?tab=agenda' },
  { label: 'Aniversários', icon: Cake, path: '/calendario?tab=aniversarios' },
  { label: 'Feriados', icon: CalendarDays, path: '/calendario?tab=feriados' },
  { label: 'Avisos', icon: Megaphone, path: '/calendario?tab=avisos' },
  { label: 'Base de conhecimento', icon: BookOpen, path: '/base-conhecimento' },
  { label: 'Documentos', icon: FileText, path: '/documentos' },
  { label: 'Cooperativa de Ideias', icon: Lightbulb, path: '/cooperativa-ideias' },
  { label: 'Novos funcionários', icon: UserPlus, path: '/calendario?tab=onboarding' },
  { label: 'Links dos tribunais', icon: Link2, path: '/tribunais' },
  { label: 'Logs de auditoria', icon: ScrollText, path: '/administracao/logs' },
];

export function Administracao() {
  const navigate = useNavigate();
  const [dados, setDados] = useState<AdministracaoDados | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchFuncionarios(), fetchFerias(), fetchSolicitacoes(), fetchDocumentos(), fetchIdeias(), fetchAvisos()])
      .then(([funcionarios, ferias, solicitacoes, documentos, ideias, avisos]) =>
        setDados({ funcionarios, ferias, solicitacoes, documentos, ideias, avisos })
      )
      .catch((err) => setErro(err instanceof FuncionariosApiError ? err.message : 'Erro inesperado ao carregar a administração.'));
  }, []);

  if (erro) {
    return (
      <Card className="max-w-2xl">
        <EmptyState icon={ShieldAlert} title="Não foi possível carregar a administração" description={erro} />
      </Card>
    );
  }

  if (!dados) {
    return (
      <div className="max-w-6xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { funcionarios, ferias, solicitacoes, documentos, ideias, avisos } = dados;

  const feriasEsteMes = ferias.filter((v) => isSameMonth(v.inicio, new Date()));
  const solicitacoesAbertas = solicitacoes.filter((r) => r.status === 'ABERTO' || r.status === 'EM_ANALISE' || r.status === 'EM_ANDAMENTO');
  const avisosAtivos = avisos.filter((a) => !a.lido);
  const ideiasNovas = ideias.filter((i) => i.status === 'NOVA' || i.status === 'EM_ANALISE');

  return (
    <div className="stagger-fade max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-gold" /> Administração
        </h1>
        <p className="text-text-secondary text-sm mt-1">Painel administrativo do escritório.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Users} label="Funcionários" value={funcionarios.length} countDelay={0} />
        <StatCard icon={Palmtree} label="Férias este mês" value={feriasEsteMes.length} tone="gold" countDelay={50} />
        <StatCard icon={Inbox} label="Solicitações abertas" value={solicitacoesAbertas.length} tone="gold" countDelay={100} />
        <StatCard icon={FileText} label="Documentos" value={documentos.length} countDelay={150} />
        <StatCard icon={Lightbulb} label="Ideias novas" value={ideiasNovas.length} tone="gold" countDelay={200} />
        <StatCard icon={Megaphone} label="Avisos ativos" value={avisosAtivos.length} countDelay={250} />
      </div>

      <div>
        <Card>
          <CardHeader title="Módulos administrativos" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {modules.map((m) => (
              <button
                key={m.path}
                onClick={() => navigate(m.path)}
                className="flex items-center gap-3 rounded-xl border border-border px-4 py-3.5 hover:border-gold/50 hover:bg-gold/5 hover:scale-[1.015] transition-[background-color,border-color,transform] duration-200 text-left"
              >
                <m.icon className="w-4.5 h-4.5 text-navy shrink-0" strokeWidth={1.75} />
                <span className="text-sm text-navy font-medium">{m.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader title="Perguntas mais realizadas à IA" />
          <p className="text-xs text-text-secondary -mt-2 mb-4">
            Ajuda a identificar quais informações precisam ser melhor documentadas.
          </p>
          <p className="text-sm text-text-secondary">
            Sem estatística de uso ainda — o Assistente IA não registra as perguntas feitas por enquanto.
          </p>
        </Card>
      </div>
    </div>
  );
}
