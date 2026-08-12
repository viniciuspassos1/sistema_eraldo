import {
  Home,
  Bot,
  BookOpen,
  Scale,
  CalendarDays,
  Users,
  UserPlus,
  BookText,
  FileText,
  Link2,
  Inbox,
  Bell,
  Settings,
  KeyRound,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const navItems: NavItem[] = [
  { label: 'Início', path: '/', icon: Home },
  { label: 'Meu Authenticator', path: '/meu-authenticator', icon: KeyRound },
  { label: 'Assistente IA', path: '/assistente-ia', icon: Bot },
  { label: 'Base de Conhecimento', path: '/base-conhecimento', icon: BookOpen },
  { label: 'Audiências', path: '/audiencias', icon: Scale },
  { label: 'Calendário do Escritório', path: '/calendario', icon: CalendarDays },
  { label: 'Funcionários', path: '/funcionarios', icon: Users },
  { label: 'Onboarding', path: '/onboarding', icon: UserPlus },
  { label: 'Manual Interno', path: '/manual', icon: BookText },
  { label: 'Documentos', path: '/documentos', icon: FileText },
  { label: 'Tribunais', path: '/tribunais', icon: Link2 },
  { label: 'Solicitações', path: '/solicitacoes', icon: Inbox },
  { label: 'Notificações', path: '/notificacoes', icon: Bell },
  { label: 'Administração', path: '/administracao', icon: Settings, adminOnly: true },
];
