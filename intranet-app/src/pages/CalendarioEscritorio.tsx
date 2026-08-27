import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, Palmtree, Stethoscope, Cake, CalendarDays, Megaphone, Users, UserPlus, type LucideIcon } from 'lucide-react';
import { Agenda } from './Agenda';
import { Ferias } from './Ferias';
import { Atestados } from './Atestados';
import { Aniversarios } from './Aniversarios';
import { Feriados } from './Feriados';
import { Avisos } from './Avisos';
import { Funcionarios } from './Funcionarios';
import { Onboarding } from './Onboarding';

interface TabDef {
  id: string;
  label: string;
  icon: LucideIcon;
  Component: () => React.JSX.Element;
}

const TABS: TabDef[] = [
  { id: 'agenda', label: 'Agenda', icon: Calendar, Component: Agenda },
  { id: 'ferias', label: 'Férias', icon: Palmtree, Component: Ferias },
  { id: 'atestado', label: 'Atestado', icon: Stethoscope, Component: Atestados },
  { id: 'aniversarios', label: 'Aniversários', icon: Cake, Component: Aniversarios },
  { id: 'feriados', label: 'Feriados', icon: CalendarDays, Component: Feriados },
  { id: 'avisos', label: 'Avisos', icon: Megaphone, Component: Avisos },
  { id: 'funcionarios', label: 'Funcionários', icon: Users, Component: Funcionarios },
  { id: 'onboarding', label: 'Onboarding', icon: UserPlus, Component: Onboarding },
];

export function CalendarioEscritorio() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');
  const active = TABS.some((t) => t.id === requested) ? requested! : TABS[0].id;

  const ActiveComponent = TABS.find((t) => t.id === active)!.Component;

  function selectTab(id: string) {
    setSearchParams(id === TABS[0].id ? {} : { tab: id });
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => selectTab(t.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive ? 'text-navy' : 'text-text-secondary hover:text-navy'
              }`}
            >
              <t.icon className="w-4 h-4" strokeWidth={1.75} />
              {t.label}
              {isActive && (
                <motion.span
                  layoutId="calendario-tab-indicator"
                  className="absolute left-0 right-0 -bottom-px h-0.5 bg-gold"
                  transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.6 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <ActiveComponent />
    </div>
  );
}
