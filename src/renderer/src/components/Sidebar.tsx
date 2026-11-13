import { NavLink } from 'react-router';
import {
  Activity,
  Brain,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Monitor,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { Logo } from './Logo';
import { uz } from '../i18n/uz';

const items: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: uz.nav.dashboard, icon: LayoutDashboard },
  { to: '/assistant', label: uz.nav.assistant, icon: MessageSquare },
  { to: '/computer', label: uz.nav.computer, icon: Monitor },
  { to: '/memory', label: uz.nav.memory, icon: Brain },
  { to: '/tasks', label: uz.nav.tasks, icon: ListTodo },
  { to: '/monitoring', label: uz.nav.monitoring, icon: Activity },
];

function Item({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) => `nav__item${isActive ? ' is-active' : ''}`}
    >
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <aside className="sidebar">
      {/* HashRouter'da "#main" havolasi route'ni o'zgartirib yuboradi, shuning uchun fokus qo'lda ko'chiriladi. */}
      <button type="button" className="skip-link" onClick={() => document.getElementById('main')?.focus()}>
        Asosiy qismga o‘tish
      </button>
      <Logo />
      <nav className="nav" aria-label="Asosiy navigatsiya">
        {items.map((item) => (
          <Item key={item.to} {...item} />
        ))}
      </nav>
      <nav className="nav nav--bottom" aria-label="Sozlamalar">
        <Item to="/settings" label={uz.nav.settings} icon={Settings} />
      </nav>
    </aside>
  );
}
