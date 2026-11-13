import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Brain, Download, Pencil, Search, Trash2 } from 'lucide-react';
import { MAX_MEMORY_LENGTH, type MemoryItem } from '@shared/ipc';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/StateViews';
import { useSettings } from '../../store/settings';

/** Xotira (prompt §14): ko'rish, qidirish, tahrirlash, o'chirish, eksport, yoqish/o'chirish. */
export function MemoryPage() {
  const { settings, update } = useSettings();
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    let alive = true;
    void window.marius.memory.list().then((r) => alive && r.ok && setItems(r.data));
    return () => {
      alive = false;
    };
  }, []);

  const apply = async (p: ReturnType<typeof window.marius.memory.list>, ok?: string) => {
    const r = await p;
    if (r.ok) {
      setItems(r.data);
      setError(null);
      setNotice(ok ?? null);
      return true;
    }
    setError(r.error.message);
    return false;
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? items.filter((i) => i.content.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await apply(window.marius.memory.create(draft), 'Qo‘shildi.')) setDraft('');
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), items }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `marius-xotira-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!settings) return null;

  return (
    <div className="page">
      <PageHeader
        title="Xotira"
        subtitle="MARIUS siz rozilik bergan ma’lumotlarni eslab qoladi va suhbatlarda foydalanadi. Hammasi shu kompyuterda."
        actions={
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={exportJson}
            disabled={!items.length}
          >
            <Download size={14} aria-hidden="true" /> Eksport (JSON)
          </button>
        }
      />

      <section className="card settings-section">
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.memoryEnabled}
            onChange={(e) => void update({ memoryEnabled: e.target.checked })}
          />
          <span className="toggle__track" aria-hidden="true" />
          <span>
            <strong>Xotira yoqilgan</strong>
            <small>
              O‘chirilsa, yozuvlar saqlanib qoladi, lekin MARIUS ularni AI’ga yubormaydi va yangi narsani
              eslab qolmaydi. AI har safar eslab qolishdan oldin ruxsat so‘raydi. Parol va karta raqami kabi
              maxfiy ma’lumotlar saqlanmaydi.
            </small>
          </span>
        </label>
        <form className="inline-form" onSubmit={(e) => void add(e)}>
          <input
            className="input"
            aria-label="Yangi xotira yozuvi"
            placeholder="Masalan: Men C++ o‘rganyapman"
            maxLength={MAX_MEMORY_LENGTH}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="btn btn--primary" disabled={!draft.trim()}>
            Qo‘shish
          </button>
        </form>
        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="small status--success" role="status">
            ✓ {notice}
          </p>
        )}
      </section>

      <section className="card settings-section" aria-labelledby="memory-list-title">
        <div className="section-head">
          <h2 id="memory-list-title">
            <Brain size={18} aria-hidden="true" /> Yozuvlar ({items.length})
          </h2>
          {items.length > 0 &&
            (confirmClear ? (
              <span className="confirm-inline">
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() =>
                    void window.marius.memory.clear().then(() => {
                      setItems([]);
                      setConfirmClear(false);
                      setNotice('Barcha yozuvlar o‘chirildi.');
                    })
                  }
                >
                  Ha, hammasini o‘chirish
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setConfirmClear(false)}
                >
                  Yo‘q
                </button>
              </span>
            ) : (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmClear(true)}>
                <Trash2 size={14} aria-hidden="true" /> Hammasini o‘chirish
              </button>
            ))}
        </div>
        {items.length > 3 && (
          <label className="search">
            <Search size={16} aria-hidden="true" />
            <span className="visually-hidden">Xotiradan qidirish</span>
            <input
              className="search__input"
              placeholder="Qidirish…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        )}
        {filtered.length === 0 ? (
          <EmptyState title="Hali hech narsa eslab qolinmagan">
            MARIUS’ga “Eslab qol: …” deb ayting yoki yuqorida qo‘shing.
          </EmptyState>
        ) : (
          <ul className="item-list" aria-label="Xotira yozuvlari">
            {filtered.map((m) =>
              editing?.id === m.id ? (
                <li key={m.id}>
                  <input
                    className="input"
                    aria-label="Yozuvni tahrirlash"
                    value={editing.content}
                    maxLength={MAX_MEMORY_LENGTH}
                    onChange={(e) => setEditing({ id: m.id, content: e.target.value })}
                  />
                  <span className="row-actions">
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() =>
                        void apply(window.marius.memory.update(m.id, editing.content), 'Saqlandi.').then(
                          (ok) => ok && setEditing(null),
                        )
                      }
                    >
                      Saqlash
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(null)}>
                      Bekor
                    </button>
                  </span>
                </li>
              ) : (
                <li key={m.id}>
                  <span className="item-list__name item-list__name--wrap">
                    {m.content}
                    <small className="muted">
                      {' '}
                      · {m.source === 'ai_approved' ? 'MARIUS (tasdiqlangan)' : 'siz qo‘shgansiz'}
                    </small>
                  </span>
                  <span className="row-actions">
                    <button
                      type="button"
                      className="icon-btn icon-btn--sm"
                      onClick={() => setEditing({ id: m.id, content: m.content })}
                      aria-label="Tahrirlash"
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--sm"
                      onClick={() => void apply(window.marius.memory.delete(m.id), 'O‘chirildi.')}
                      aria-label={`“${m.content}” ni o‘chirish`}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </span>
                </li>
              ),
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
