import {
  Home,
  Bot,
  BookOpen,
  CalendarDays,
  BookText,
  FileText,
  Lightbulb,
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
  /** Chave usada em user.permissoes — controla exibição no menu e checagem de rota. */
  permissionKey?: string;
}

export const navItems: NavItem[] = [
  { label: 'Início', path: '/', icon: Home, permissionKey: 'dashboard' },
  { label: 'Meu Authenticator', path: '/meu-authenticator', icon: KeyRound, permissionKey: 'meu-authenticator' },
  { label: 'Assistente IA', path: '/assistente-ia', icon: Bot, permissionKey: 'assistente-ia' },
  { label: 'Base de Conhecimento', path: '/base-conhecimento', icon: BookOpen, permissionKey: 'base-conhecimento' },
  { label: 'Calendário do Escritório', path: '/calendario', icon: CalendarDays, permissionKey: 'calendario' },
  { label: 'Manual Interno', path: '/manual', icon: BookText, permissionKey: 'manual' },
  { label: 'Documentos', path: '/documentos', icon: FileText, permissionKey: 'documentos' },
  { label: 'Cooperativa de Ideias', path: '/cooperativa-ideias', icon: Lightbulb, permissionKey: 'cooperativa-ideias' },
  { label: 'Tribunais', path: '/tribunais', icon: Link2, permissionKey: 'tribunais' },
  { label: 'Solicitações', path: '/solicitacoes', icon: Inbox, permissionKey: 'solicitacoes' },
  { label: 'Notificações', path: '/notificacoes', icon: Bell, permissionKey: 'notificacoes' },
  { label: 'Administração', path: '/administracao', icon: Settings, adminOnly: true },
];
