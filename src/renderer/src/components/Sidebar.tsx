import { NavLink } from 'react-router';
import {
  Brain,
  ClipboardList,
  History,
  House,
  Laptop,
  MessageCircle,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { Logo } from './Logo';
import { uz } from '../i18n/uz';

/** Navigatsiya foydalanuvchi dizayni bo'yicha. Monitoring bosh sahifadagi "Kompyuter holati" panelida. */
export const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: uz.nav.dashboard, icon: House },
  { to: '/chat', label: uz.nav.chat, icon: MessageCircle },
  { to: '/memory', label: uz.nav.memory, icon: Brain },
  { to: '/tasks', label: uz.nav.tasks, icon: ClipboardList },
  { to: '/history', label: uz.nav.history, icon: History },
  { to: '/computer', label: uz.nav.computer, icon: Laptop },
  { to: '/settings', label: uz.nav.settings, icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      {/* HashRouter'da "#main" havolasi route'ni o'zgartirib yuboradi, shuning uchun fokus qo'lda ko'chiriladi. */}
      <button type="button" className="skip-link" onClick={() => document.getElementById('main')?.focus()}>
        Asosiy qismga o‘tish
      </button>
      <Logo />
      <nav className="nav" aria-label="Asosiy navigatsiya">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav__item${isActive ? ' is-active' : ''}`}
            title={label}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
