import { useCallback, useEffect, useState } from 'react';
import { Activity, Lock, RefreshCw, X } from 'lucide-react';
import type { ActionResult, ProcessGroup } from '@shared/ipc';
const REFRESH_MS = 10_000;

/** Task Manager kabi: 1 GB dan kichigi MB'da */
const formatMem = (b: number) =>
  b >= 1024 ** 3
    ? `${(b / 1024 ** 3).toFixed(1)} GB`
    : `${Math.max(0.1, b / 1024 ** 2).toFixed(b < 10 * 1024 ** 2 ? 1 : 0)} MB`;

/**
 * Kompyuter → Jarayonlar (Task Manager kabi). Har bir dastur: jarayonlar soni, CPU va RAM.
 * Yopish har safar tasdiq oynasi orqali; tizim jarayonlari va MARIUS himoyalangan.
 */
export function ProcessesSection({ onResult }: { onResult: (r: ActionResult) => void }) {
  const [sortBy, setSortBy] = useState<'memory' | 'cpu'>('memory');
  const [data, setData] = useState<{ groups: ProcessGroup[]; memoryTotalBytes: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [forceFor, setForceFor] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await window.marius.computer.listProcesses(sortBy);
    setLoading(false);
    if (r.ok) {
      setData(r.data);
      setError(null);
    } else setError(r.error.message);
  }, [sortBy]);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (alive && document.visibilityState === 'visible') void load();
    };
    tick();
    const t = setInterval(tick, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [load]);

  const close = async (name: string, force: boolean) => {
    setBusy(name);
    const r = await window.marius.computer.closeApp(name, force);
    setBusy(null);
    const result: ActionResult = r.ok ? r.data : { ok: false, verified: null, message: r.error.message };
    onResult(result);
    // Oddiy yopish ishlamasa, majburan yopish tugmasi taklif qilinadi
    setForceFor(!force && result.verified !== true && /majburan/i.test(result.message) ? name : null);
    void load();
  };

  const groups = data?.groups ?? [];
  const visible = showAll ? groups : groups.slice(0, 12);

  return (
    <section className="card settings-section" aria-labelledby="proc-title">
      <div className="section-head">
        <h2 id="proc-title">
          <Activity size={18} aria-hidden="true" /> Jarayonlar
        </h2>
        <div className="row-actions">
          <div className="segmented segmented--sm" role="radiogroup" aria-label="Saralash">
            {(
              [
                ['memory', 'RAM'],
                ['cpu', 'CPU'],
              ] as const
            ).map(([v, label]) => (
              <label key={v} className={`segmented__option${sortBy === v ? ' is-active' : ''}`}>
                <input type="radio" name="proc-sort" checked={sortBy === v} onChange={() => setSortBy(v)} />
                {label}
              </label>
            ))}
          </div>
          <button
            type="button"
            className="icon-btn icon-btn--sm"
            onClick={() => void load()}
            aria-label="Jarayonlar ro‘yxatini yangilash"
            title="Yangilash"
          >
            <RefreshCw size={14} aria-hidden="true" className={loading ? 'spin' : undefined} />
          </button>
        </div>
      </div>
      <p className="small muted">
        Har 10 soniyada yangilanadi. Dasturni yopishdan oldin tasdiq so‘raladi. Tizim jarayonlari{' '}
        <Lock size={12} aria-hidden="true" /> yopilmaydi.
      </p>
      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}
      {data && (
        <table className="proc-table">
          <thead>
            <tr>
              <th scope="col">Dastur</th>
              <th scope="col" className="num">
                CPU
              </th>
              <th scope="col" className="num">
                RAM
              </th>
              <th scope="col">
                <span className="visually-hidden">Amal</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((g) => (
              <tr key={g.name}>
                <th scope="row">
                  <span className="proc-table__name">
                    {g.protected && <Lock size={12} aria-label="Tizim jarayoni" />} {g.name}
                    {g.count > 1 && <small className="muted"> ({g.count})</small>}
                  </span>
                  {g.title && <small className="proc-table__title muted">{g.title}</small>}
                </th>
                <td className="num">{g.cpuPercent === null ? '—' : `${g.cpuPercent.toFixed(1)}%`}</td>
                <td className="num">
                  {formatMem(g.memoryBytes)}
                  <span className="proc-bar" aria-hidden="true">
                    <span
                      style={{ width: `${Math.min(100, (g.memoryBytes / data.memoryTotalBytes) * 100)}%` }}
                    />
                  </span>
                </td>
                <td className="num">
                  {!g.protected &&
                    (forceFor === g.name ? (
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        disabled={busy !== null}
                        onClick={() => void close(g.name, true)}
                        aria-label={`${g.name} ni majburan yopish`}
                      >
                        Majburan yopish
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={busy !== null}
                        onClick={() => void close(g.name, false)}
                        aria-label={`${g.name} ni yopish`}
                      >
                        <X size={14} aria-hidden="true" /> Yopish
                      </button>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {groups.length > 12 && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Kamroq ko‘rsatish' : `Hammasini ko‘rsatish (${groups.length})`}
        </button>
      )}
    </section>
  );
}
