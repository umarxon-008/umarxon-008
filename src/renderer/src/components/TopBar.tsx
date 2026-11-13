import { Link } from 'react-router';
import { Settings, UserRound } from 'lucide-react';
import { uz } from '../i18n/uz';

/** Yuqori panel: tizim holati, sozlamalar va foydalanuvchi belgisi. */
export function TopBar() {
  return (
    <header className="topbar">
      <span className="chip chip--status" role="status">
        <span className="chip__dot" aria-hidden="true" />
        {uz.status.systemActive}
      </span>
      <div className="topbar__actions">
        <Link to="/settings" className="btn btn--secondary btn--sm">
          <Settings size={16} aria-hidden="true" />
          {uz.nav.settings}
        </Link>
        <span className="avatar" title="Foydalanuvchi profili (keyingi bosqichlarda)">
          <UserRound size={18} aria-hidden="true" />
        </span>
      </div>
    </header>
  );
}
