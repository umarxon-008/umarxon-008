import {
  Bell,
  Bot,
  Building2,
  CreditCard,
  Gauge,
  LayoutDashboard,
  LineChart,
  Map,
  Settings,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';
import type { Permission } from '@/lib/permissions';

export interface NavItem {
  href: string;
  label: string;
  icon: typeof Gauge;
  permission?: Permission;
  adminOnly?: boolean;
}

export const APP_NAV: NavItem[] = [
  { href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/factory-map', label: 'Factory Map', icon: Map },
  { href: '/app/monitoring', label: 'Monitoring', icon: Gauge },
  { href: '/app/ai-inspector', label: 'AI Inspector', icon: Bot },
  { href: '/app/analytics', label: 'Analytics', icon: LineChart },
  { href: '/app/equipment', label: 'Uskunalar', icon: Wrench },
  { href: '/app/notifications', label: 'Bildirishnomalar', icon: Bell },
  { href: '/app/organization', label: 'Korxona', icon: Building2 },
  { href: '/app/users', label: 'Foydalanuvchilar', icon: Users, permission: 'users.view' },
  { href: '/app/billing', label: 'Tariflar', icon: CreditCard },
  { href: '/app/settings', label: 'Sozlamalar', icon: Settings },
  { href: '/app/admin', label: 'Platforma admin', icon: ShieldCheck, adminOnly: true },
];

export const SEARCHABLE_PAGES = APP_NAV.map((n) => ({ href: n.href, label: n.label }));
