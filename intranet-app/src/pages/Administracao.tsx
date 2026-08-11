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
  UserPlus,
  Link2,
  ShieldCheck,
  Scale,
  Inbox,
} from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { employees } from '../mocks/employees';
import { vacations } from '../mocks/vacations';
import { hearings } from '../mocks/hearings';
import { requests } from '../mocks/agenda';
import { documents } from '../mocks/documents';
import { announcements } from '../mocks/announcements';
import { isSameMonth } from '../utils/date';

const modules = [
  { label: 'Funcionários', icon: Users, path: '/funcionarios' },
  { label: 'Férias', icon: Palmtree, path: '/ferias' },
  { label: 'Agenda', icon: Calendar, path: '/agenda' },
  { label: 'Aniversários', icon: Cake, path: '/aniversarios' },
  { label: 'Feriados', icon: CalendarDays, path: '/feriados' },
  { label: 'Avisos', icon: Megaphone, path: '/avisos' },
  { label: 'Base de conhecimento', icon: BookOpen, path: '/base-conhecimento' },
  { label: 'Documentos', icon: FileText, path: '/documentos' },
  { label: 'Novos funcionários', icon: UserPlus, path: '/onboarding' },
  { label: 'Links dos tribunais', icon: Link2, path: '/tribunais' },
  { label: 'Usuários e permissões', icon: ShieldCheck, path: '/administracao/usuarios' },
];

const perguntasFrequentes = [
  { pergunta: 'Quando são minhas próximas férias?', vezes: 34 },
  { pergunta: 'Quais audiências tenho amanhã?', vezes: 28 },
  { pergunta: 'Qual o link do TJBA?', vezes: 21 },
  { pergunta: 'Qual o procedimento para abertura de processo previdenciário?', vezes: 17 },
  { pergunta: 'Quem está de férias este mês?', vezes: 12 },
];

export function Administracao() {
  const navigate = useNavigate();

  const feriasEsteMes = vacations.filter((v) => isSameMonth(v.inicio, new Date()));
  const audienciasAgendadas = hearings.filter((h) => h.status === 'AGENDADA');
  const solicitacoesAbertas = requests.filter((r) => r.status === 'ABERTO' || r.status === 'EM_ANALISE' || r.status === 'EM_ANDAMENTO');
  const avisosAtivos = announcements.filter((a) => !a.lido);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-gold" /> Administração
        </h1>
        <p className="text-text-secondary text-sm mt-1">Painel administrativo do escritório.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Users} label="Funcionários" value={employees.length} />
        <StatCard icon={Palmtree} label="Férias este mês" value={feriasEsteMes.length} tone="gold" />
        <StatCard icon={Scale} label="Audiências" value={audienciasAgendadas.length} />
        <StatCard icon={Inbox} label="Solicitações abertas" value={solicitacoesAbertas.length} tone="gold" />
        <StatCard icon={FileText} label="Documentos" value={documents.length} />
        <StatCard icon={Megaphone} label="Avisos ativos" value={avisosAtivos.length} />
      </div>

      <Card>
        <CardHeader title="Módulos administrativos" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {modules.map((m) => (
            <button
              key={m.path}
              onClick={() => navigate(m.path)}
              className="flex items-center gap-3 rounded-xl border border-border px-4 py-3.5 hover:border-gold/50 hover:bg-gold/5 transition-colors text-left"
            >
              <m.icon className="w-4.5 h-4.5 text-navy shrink-0" strokeWidth={1.75} />
              <span className="text-sm text-navy font-medium">{m.label}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Perguntas mais realizadas à IA" />
        <p className="text-xs text-text-secondary -mt-2 mb-4">
          Ajuda a identificar quais informações precisam ser melhor documentadas.
        </p>
        <ul className="space-y-3">
          {perguntasFrequentes.map((p) => (
            <li key={p.pergunta} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm text-navy">{p.pergunta}</p>
                <div className="h-1.5 bg-cream rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gold rounded-full"
                    style={{ width: `${(p.vezes / perguntasFrequentes[0].vezes) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-text-secondary w-16 text-right shrink-0">{p.vezes}x</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
