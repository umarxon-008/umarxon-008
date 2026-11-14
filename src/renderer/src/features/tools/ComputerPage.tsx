import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppWindow,
  CheckCircle2,
  Cpu,
  HelpCircle,
  Loader2,
  Play,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import type { ActionResult, AppEntry, ComputerInfo, WindowEntry } from '@shared/ipc';
import { PageHeader } from '../../components/PageHeader';
import { formatBytes } from '../monitoring/SystemStatusPanel';
import { FilesSection } from './FilesSection';
import { MediaSection } from './MediaSection';
import { ScreenSection } from './ScreenSection';

function ResultLine({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  const icon = !result.ok ? (
    <XCircle size={16} aria-hidden="true" />
  ) : result.verified === false ? (
    <HelpCircle size={16} aria-hidden="true" />
  ) : (
    <CheckCircle2 size={16} aria-hidden="true" />
  );
  const tone = !result.ok ? 'is-fail' : result.verified === false ? 'is-warn' : 'is-ok';
  return (
    <p className={`test-result ${tone}`} role="status">
      {icon} {result.message}
    </p>
  );
}

/** Kompyuter sahifasi (prompt §18): mavjud dasturlar, ochiq oynalar, tizim. Har bir amal audit qilinadi. */
export function ComputerPage() {
  const [info, setInfo] = useState<ComputerInfo | null>(null);
  const [apps, setApps] = useState<AppEntry[] | null>(null);
  const [windows, setWindows] = useState<WindowEntry[] | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);

  const loadApps = useCallback(async (refresh: boolean) => {
    setBusy('apps');
    const r = await window.marius.computer.listApps(refresh);
    setBusy(null);
    if (r.ok) setApps(r.data);
    else setError(r.error.message);
  }, []);

  const loadWindows = useCallback(async () => {
    const r = await window.marius.computer.listWindows();
    if (r.ok) setWindows(r.data);
    else setError(r.error.message);
  }, []);

  useEffect(() => {
    void window.marius.computer.info().then((r) => {
      if (!r.ok) return;
      setInfo(r.data);
      if (r.data.supported) {
        void loadApps(false);
        void loadWindows();
      }
    });
  }, [loadApps, loadWindows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (apps ?? []).filter((a) => !q || a.name.toLowerCase().includes(q)).slice(0, 200);
  }, [apps, query]);

  const launch = async (app: AppEntry) => {
    setBusy(app.id);
    setResult(null);
    const r = await window.marius.computer.launchApp(app.id);
    setBusy(null);
    setResult(r.ok ? r.data : { ok: false, message: r.error.message, verified: null });
    void loadWindows();
  };

  const focus = async (w: WindowEntry) => {
    setBusy(`w${w.pid}`);
    setResult(null);
    const r = await window.marius.computer.focusWindow(w.pid);
    setBusy(null);
    setResult(r.ok ? r.data : { ok: false, message: r.error.message, verified: null });
  };

  return (
    <div className="page">
      <PageHeader
        title="Kompyuter"
        subtitle="Dasturlarni ochish va oynalar. Har bir amal “Tarix” bo‘limiga yoziladi."
      />

      {info && !info.supported && (
        <p className="alert alert--warn">
          Dasturlar va oynalar bilan ishlash hozircha faqat Windows’da mavjud (joriy tizim: {info.osName}).
        </p>
      )}
      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}
      <ResultLine result={result} />

      {info && (
        <section className="card settings-section" aria-labelledby="sys-title">
          <h2 id="sys-title">
            <Cpu size={18} aria-hidden="true" /> Tizim
          </h2>
          <dl className="info-list">
            <dt>Operatsion tizim</dt>
            <dd>{info.osName}</dd>
            <dt>Protsessor</dt>
            <dd>
              {info.cpuModel} · {info.cores} yadro
            </dd>
            <dt>Operativ xotira</dt>
            <dd>{formatBytes(info.memoryTotalBytes)}</dd>
            <dt>Ishlash vaqti</dt>
            <dd>{Math.round(info.uptimeSeconds / 3600)} soat</dd>
            <dt>Batareya</dt>
            <dd>
              {info.battery
                ? `${info.battery.percent}%${info.battery.charging ? ' · quvvatga ulangan' : ''}`
                : 'Yo‘q'}
            </dd>
          </dl>
        </section>
      )}

      {info && <FilesSection onResult={setResult} />}

      {info && (
        <div className="grid grid--wide">
          <ScreenSection />
          {info.supported && <MediaSection onResult={setResult} />}
        </div>
      )}

      {info?.supported && (
        <div className="grid grid--wide">
          <section className="card settings-section" aria-labelledby="apps-title">
            <div className="section-head">
              <h2 id="apps-title">Dasturlar {apps ? `(${apps.length})` : ''}</h2>
              <button
                type="button"
                className="icon-btn icon-btn--sm"
                onClick={() => void loadApps(true)}
                aria-label="Dasturlar ro‘yxatini yangilash"
                title="Yangilash"
              >
                <RefreshCw size={14} aria-hidden="true" className={busy === 'apps' ? 'spin' : undefined} />
              </button>
            </div>
            <label className="search">
              <Search size={16} aria-hidden="true" />
              <span className="visually-hidden">Dastur qidirish</span>
              <input
                className="search__input"
                placeholder="Qidirish…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {apps === null ? (
              <p className="muted small">
                <Loader2 size={14} className="spin" aria-hidden="true" /> Yuklanmoqda…
              </p>
            ) : (
              <ul className="item-list" aria-label="Dasturlar">
                {filtered.map((a) => (
                  <li key={a.id}>
                    <span className="item-list__name">{a.name}</span>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      disabled={busy !== null}
                      onClick={() => void launch(a)}
                      aria-label={`${a.name} ni ochish`}
                    >
                      {busy === a.id ? (
                        <Loader2 size={14} className="spin" aria-hidden="true" />
                      ) : (
                        <Play size={14} aria-hidden="true" />
                      )}
                      Ochish
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && <li className="muted small">Hech narsa topilmadi.</li>}
              </ul>
            )}
          </section>

          <section className="card settings-section" aria-labelledby="win-title">
            <div className="section-head">
              <h2 id="win-title">Ochiq oynalar {windows ? `(${windows.length})` : ''}</h2>
              <button
                type="button"
                className="icon-btn icon-btn--sm"
                onClick={() => void loadWindows()}
                aria-label="Oynalar ro‘yxatini yangilash"
                title="Yangilash"
              >
                <RefreshCw size={14} aria-hidden="true" />
              </button>
            </div>
            <ul className="item-list" aria-label="Ochiq oynalar">
              {(windows ?? []).map((w) => (
                <li key={w.pid}>
                  <span className="item-list__name">
                    <AppWindow size={14} aria-hidden="true" /> {w.title}
                    <small className="muted"> · {w.app}</small>
                  </span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={busy !== null}
                    onClick={() => void focus(w)}
                    aria-label={`“${w.title}” oynasiga o‘tish`}
                  >
                    O‘tish
                  </button>
                </li>
              ))}
              {windows?.length === 0 && <li className="muted small">Ochiq oynalar yo‘q.</li>}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
