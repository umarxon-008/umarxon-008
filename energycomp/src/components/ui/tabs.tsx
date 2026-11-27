'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/** URL hash bilan sinxron tablar (masalan, /app/organization#tariff). */
export function Tabs({ tabs }: { tabs: { id: string; label: string; content: React.ReactNode; hidden?: boolean }[] }) {
  const visible = tabs.filter((t) => !t.hidden);
  const [active, setActive] = useState(visible[0]?.id);
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      if (visible.some((t) => t.id === h)) setActive(h);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div>
      <div role="tablist" aria-label="Bo‘limlar" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {visible.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            type="button"
            onClick={() => {
              setActive(t.id);
              history.replaceState(null, '', `#${t.id}`);
            }}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
              active === t.id ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-navy',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {visible.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={active !== t.id}>
          {active === t.id && t.content}
        </div>
      ))}
    </div>
  );
}
