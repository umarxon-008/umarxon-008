import { Bot, Building2, Gauge, LayoutDashboard, LineChart, Map, Settings, Users } from 'lucide-react';
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
  { href: '/app/organization', label: 'Korxona', icon: Building2 },
  { href: '/app/users', label: 'Foydalanuvchilar', icon: Users, permission: 'users.view' },
  { href: '/app/settings', label: 'Sozlamalar', icon: Settings },
];

/** Qidiruvda topiladigan sahifalar (yon menyuda bo'lmaganlari ham). */
export const SEARCHABLE_PAGES = [
  ...APP_NAV.map((n) => ({ href: n.href, label: n.label })),
  { href: '/app/equipment', label: 'Uskunalar' },
  { href: '/app/notifications', label: 'Bildirishnomalar' },
  { href: '/app/billing', label: 'Tarif va obuna' },
];
