import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import type { AuditEntry } from '@shared/ipc';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/StateViews';
import { LEVEL_LABELS, STATUS_LABELS } from './labels';

const CONFIRMATION_LABELS: Record<AuditEntry['confirmation'], string> = {
  not_required: 'Kerak emas',
  approved: 'Tasdiqlandi',
  denied: 'Rad etildi',
  timeout: 'Vaqt tugadi',
  user_initiated: 'Siz bosgansiz',
};

/** Tarix (prompt §14 D, §20.6): MARIUS bajargan barcha amallar jurnali. */
export function HistoryPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    const r = await window.marius.audit.list(300);
    if (r.ok) setEntries(r.data);
  }, []);

  useEffect(() => {
    let alive = true;
    void window.marius.audit.list(300).then((r) => {
      if (alive && r.ok) setEntries(r.data);
    });
    return () => {
      alive = false;
    };
  }, []);

  const clear = async () => {
    await window.marius.audit.clear();
    setConfirming(false);
    await load();
  };

  return (
    <div className="page">
      <PageHeader
        title="Tarix"
        subtitle="MARIUS bajargan va bajarishga uringan barcha amallar. Faqat shu kompyuterda saqlanadi."
        actions={
          <>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => void load()}>
              <RefreshCw size={14} aria-hidden="true" /> Yangilash
            </button>
            {confirming ? (
              <span className="confirm-inline">
                <button type="button" className="btn btn--danger btn--sm" onClick={() => void clear()}>
                  Ha, tozalash
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirming(false)}>
                  Yo‘q
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setConfirming(true)}
                disabled={!entries?.length}
              >
                <Trash2 size={14} aria-hidden="true" /> Tozalash
              </button>
            )}
          </>
        }
      />

      {entries && entries.length === 0 ? (
        <section className="card">
          <EmptyState title="Hali amallar yo‘q">
            MARIUS’dan dastur ochishni so‘rang yoki Kompyuter bo‘limidan foydalaning.
          </EmptyState>
        </section>
      ) : (
        <section className="card table-card">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Vaqt</th>
                <th>Amal</th>
                <th>Kim</th>
                <th>Daraja</th>
                <th>Tasdiq</th>
                <th>Natija</th>
              </tr>
            </thead>
            <tbody>
              {(entries ?? []).map((e) => (
                <tr key={e.id}>
                  <td className="nowrap">
                    {new Date(e.createdAt).toLocaleString('uz-UZ', {
                      dateStyle: 'short',
                      timeStyle: 'medium',
                    })}
                  </td>
                  <td>{e.summary}</td>
                  <td>{e.source === 'ai' ? 'MARIUS' : 'Siz'}</td>
                  <td>
                    <span className={`level level--${e.permissionLevel}`}>
                      {LEVEL_LABELS[e.permissionLevel].title}
                    </span>
                  </td>
                  <td>{CONFIRMATION_LABELS[e.confirmation]}</td>
                  <td>
                    <span className={`status status--${e.status}`}>{STATUS_LABELS[e.status]}</span>
                    {e.durationMs !== null && <small className="muted"> · {e.durationMs} ms</small>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
