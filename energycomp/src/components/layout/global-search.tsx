'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { api } from '@/lib/api-client';
import { STATUS_LABELS, type EquipmentStatusName } from '@/lib/labels';
import { SEARCHABLE_PAGES } from './nav';

interface Result {
  href: string;
  label: string;
  hint: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState<{ term: string; items: Result[] }>({ term: '', items: [] });
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const term = q.trim().toLowerCase();

  const results = useMemo<Result[]>(() => {
    if (!term) return [];
    const pages = SEARCHABLE_PAGES.filter((p) => p.label.toLowerCase().includes(term)).map((p) => ({ href: p.href, label: p.label, hint: 'Sahifa' }));
    return remote.term === term ? [...pages, ...remote.items] : pages;
  }, [term, remote]);

  useEffect(() => {
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await api<{ equipment: { id: string; name: string; code: string; status: EquipmentStatusName }[]; factories: { id: string; name: string }[] }>(
          `/api/search?q=${encodeURIComponent(term)}`,
          { signal: ctrl.signal },
        );
        setRemote({
          term,
          items: [
            ...res.equipment.map((e) => ({ href: `/app/equipment/${e.id}`, label: `${e.name} (${e.code})`, hint: STATUS_LABELS[e.status] })),
            ...res.factories.map((f) => ({ href: `/app/factory-map?factory=${f.id}`, label: f.name, hint: 'Zavod xaritasi' })),
          ],
        });
      } catch {
        /* bekor qilingan */
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function go(r: Result) {
    setOpen(false);
    setQ('');
    router.push(r.href);
  }

  return (
    <div ref={boxRef} className="relative mx-auto w-full max-w-md">
      <label htmlFor="global-search" className="sr-only">
        Qidiruv: sahifa yoki uskuna
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        id="global-search"
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="global-search-results"
        aria-autocomplete="list"
        placeholder="Qidirish: uskuna, sahifa..."
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && results[active]) {
            e.preventDefault();
            go(results[active]);
          } else if (e.key === 'Escape') setOpen(false);
        }}
        className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-navy placeholder:text-[#94a3b8] focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
      {open && q.trim() && (
        <ul id="global-search-results" role="listbox" className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-pop">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">Hech narsa topilmadi</li>
          ) : (
            results.map((r, i) => (
              <li key={r.href + i} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${i === active ? 'bg-brand-50' : ''}`}
                >
                  <span className="truncate font-medium text-navy">{r.label}</span>
                  <span className="shrink-0 text-xs text-muted">{r.hint}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
