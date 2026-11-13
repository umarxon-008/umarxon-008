import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Bell, CalendarClock, Check, Pencil, RotateCcw, Trash2, X } from 'lucide-react';
import type { Reminder } from '@shared/ipc';
import { formatUzDateTime, parseUzbekDateTime } from '@shared/uz-time';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/StateViews';
import { useNow } from '../../lib/useNow';

/** datetime-local qiymati (mahalliy vaqt) */
function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function ReminderRow({ r, now, onChange }: { r: Reminder; now: Date; onChange: (list: Reminder[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(r.title);
  const [due, setDue] = useState(toLocalInput(new Date(r.dueAt)));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overdue = r.status === 'pending' && new Date(r.dueAt).getTime() < now.getTime();

  const apply = async (p: ReturnType<typeof window.marius.reminders.list>) => {
    const res = await p;
    if (res.ok) {
      onChange(res.data);
      setError(null);
      return true;
    }
    setError(res.error.message);
    return false;
  };

  if (editing) {
    return (
      <li className="reminder reminder--editing">
        <input
          className="input"
          aria-label="Eslatma matni"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="input input--sm"
          type="datetime-local"
          aria-label="Vaqt"
          value={due}
          onChange={(e) => setDue(e.target.value)}
        />
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() =>
            void apply(
              window.marius.reminders.update({ id: r.id, title, dueAt: new Date(due).toISOString() }),
            ).then((ok) => ok && setEditing(false))
          }
        >
          Saqlash
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(false)}>
          Bekor
        </button>
        {error && <small className="status--error">{error}</small>}
      </li>
    );
  }

  return (
    <li className={`reminder reminder--${r.status}${overdue ? ' is-overdue' : ''}`}>
      <span className="reminder__icon" aria-hidden="true">
        {r.status === 'done' ? <Check size={16} /> : <Bell size={16} />}
      </span>
      <div className="reminder__body">
        <strong>{r.title}</strong>
        <small>
          {formatUzDateTime(new Date(r.dueAt), now)}
          {overdue && ' · vaqti o‘tgan'}
          {r.status === 'done' && ' · bajarildi'}
        </small>
      </div>
      <span className="row-actions">
        {r.status === 'pending' ? (
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => void apply(window.marius.reminders.setStatus(r.id, 'done'))}
          >
            <Check size={14} aria-hidden="true" /> Bajarildi
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => void apply(window.marius.reminders.setStatus(r.id, 'pending'))}
          >
            <RotateCcw size={14} aria-hidden="true" /> Qaytarish
          </button>
        )}
        <button
          type="button"
          className="icon-btn icon-btn--sm"
          onClick={() => setEditing(true)}
          aria-label={`“${r.title}” ni tahrirlash`}
        >
          <Pencil size={14} aria-hidden="true" />
        </button>
        {confirmDelete ? (
          <>
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={() => void apply(window.marius.reminders.delete(r.id))}
            >
              O‘chirish
            </button>
            <button
              type="button"
              className="icon-btn icon-btn--sm"
              onClick={() => setConfirmDelete(false)}
              aria-label="Bekor qilish"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="icon-btn icon-btn--sm"
            onClick={() => setConfirmDelete(true)}
            aria-label={`“${r.title}” ni o‘chirish`}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        )}
      </span>
      {error && <small className="status--error">{error}</small>}
    </li>
  );
}

/** Vazifalar va eslatmalar (prompt §15, §18). */
export function TasksPage() {
  const now = useNow();
  const [items, setItems] = useState<Reminder[] | null>(null);
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [manual, setManual] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const reload = useCallback(async () => {
    const r = await window.marius.reminders.list();
    if (r.ok) setItems(r.data);
  }, []);

  useEffect(() => {
    let alive = true;
    void window.marius.reminders.list().then((r) => alive && r.ok && setItems(r.data));
    const off = window.marius.reminders.onEvent(() => void reload());
    return () => {
      alive = false;
      off();
    };
  }, [reload]);

  // "ertaga soat 8" → aniq sana (taxminlar bilan) — saqlashdan oldin ko'rinadi
  const parsed = useMemo(() => (when.trim() ? parseUzbekDateTime(when, now) : null), [when, now]);
  const dueDate = manual ? new Date(manual) : (parsed?.date ?? null);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;
    const r = await window.marius.reminders.create({ title: title.trim(), dueAt: dueDate.toISOString() });
    if (r.ok) {
      setItems(r.data);
      setTitle('');
      setWhen('');
      setManual('');
      setError(null);
    } else setError(r.error.message);
  };

  const pending = (items ?? []).filter((r) => r.status === 'pending');
  const done = (items ?? []).filter((r) => r.status !== 'pending');

  return (
    <div className="page">
      <PageHeader title="Vazifalar" subtitle="Eslatmalar: vaqti kelganda Windows bildirishnomasi chiqadi." />

      <section className="card settings-section" aria-labelledby="new-reminder">
        <h2 id="new-reminder">
          <CalendarClock size={18} aria-hidden="true" /> Yangi eslatma
        </h2>
        <form className="reminder-form" onSubmit={(e) => void add(e)}>
          <input
            className="input"
            aria-label="Nimani eslatish kerak"
            placeholder="Nimani eslatay? (masalan, darsga tayyorlanish)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="input"
            aria-label="Qachon"
            placeholder="Qachon? (masalan, ertaga ertalab soat 8)"
            value={when}
            onChange={(e) => {
              setWhen(e.target.value);
              setManual('');
            }}
          />
          <input
            className="input input--sm"
            type="datetime-local"
            aria-label="Aniq vaqt"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
          <button type="submit" className="btn btn--primary" disabled={!title.trim() || !dueDate}>
            Qo‘shish
          </button>
        </form>
        <p className="small" role="status">
          {dueDate ? (
            <>
              → <strong>{formatUzDateTime(dueDate, now)}</strong>
              {!manual && parsed?.assumed.length ? (
                <span className="muted"> (taxmin: {parsed.assumed.join(', ')})</span>
              ) : null}
            </>
          ) : when.trim() ? (
            <span className="status--error">
              Vaqtni tushunmadim. Masalan: “bugun 19:00”, “ertaga ertalab”, “2 soatdan keyin”.
            </span>
          ) : (
            <span className="muted">Vaqtni o‘zbekcha yozing yoki aniq sanani tanlang.</span>
          )}
        </p>
        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}
        <p className="small muted">
          Eslatma chiqishi uchun MARIUS ochiq bo‘lishi kerak. Oynani yopsangiz ham ishlashi uchun Sozlamalarda
          “Yopilganda tray’da qolish”ni yoqing. Ilova yopiq paytda o‘tib ketgan eslatmalar keyingi ochilishda
          ko‘rsatiladi.
        </p>
      </section>

      <section className="card settings-section" aria-labelledby="pending-title">
        <h2 id="pending-title">Kutilmoqda ({pending.length})</h2>
        {pending.length === 0 ? (
          <EmptyState title="Eslatmalar yo‘q">
            MARIUS’ga “Bugun soat 19:00 da vazifamni eslat” deb ayting yoki yuqorida qo‘shing.
          </EmptyState>
        ) : (
          <ul className="reminder-list" aria-label="Kutilayotgan eslatmalar">
            {pending.map((r) => (
              <ReminderRow key={r.id} r={r} now={now} onChange={setItems} />
            ))}
          </ul>
        )}
        {done.length > 0 && (
          <>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowDone((v) => !v)}>
              {showDone ? 'Bajarilganlarni yashirish' : `Bajarilganlar (${done.length})`}
            </button>
            {showDone && (
              <ul className="reminder-list" aria-label="Bajarilgan eslatmalar">
                {done.map((r) => (
                  <ReminderRow key={r.id} r={r} now={now} onChange={setItems} />
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
