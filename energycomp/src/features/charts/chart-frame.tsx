'use client';

import { useState } from 'react';
import { BarChart3, Table2 } from 'lucide-react';

export interface TableColumn<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
}

/** Grafik + almashtiriladigan jadval ko'rinishi (accessibility: ma'lumot faqat rangda qolmaydi). */
export function ChartFrame<T>({
  title,
  rows,
  columns,
  children,
  height = 260,
  empty,
}: {
  title: string;
  rows: T[];
  columns: TableColumn<T>[];
  children: React.ReactNode;
  height?: number;
  empty?: React.ReactNode;
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  if (rows.length === 0) return <>{empty}</>;
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setView((v) => (v === 'chart' ? 'table' : 'chart'))}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-surface hover:text-navy"
          aria-pressed={view === 'table'}
        >
          {view === 'chart' ? <Table2 className="h-3.5 w-3.5" aria-hidden /> : <BarChart3 className="h-3.5 w-3.5" aria-hidden />}
          {view === 'chart' ? 'Jadval ko‘rinishi' : 'Grafik ko‘rinishi'}
        </button>
      </div>
      {view === 'chart' ? (
        <div style={{ height }} role="img" aria-label={`${title} grafigi. Jadval ko‘rinishiga o‘tish tugmasi orqali qiymatlarni o‘qing.`}>
          {children}
        </div>
      ) : (
        <div className="max-h-[360px] overflow-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead className="sticky top-0 bg-surface text-xs text-muted">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={`px-3 py-2 font-semibold ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-line">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-3 py-1.5 tabular-nums text-navy ${c.align === 'right' ? 'text-right' : ''}`}>
                      {c.render(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
