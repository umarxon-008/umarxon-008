import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, ExternalLink, Globe, KeyRound, Trash2, XCircle } from 'lucide-react';
import type { ConnectionTest, Settings } from '@shared/ipc';
import { useSettings } from '../../store/settings';

const ENGINES: { value: Settings['searchEngine']; label: string }[] = [
  { value: 'google', label: 'Google' },
  { value: 'bing', label: 'Bing' },
  { value: 'duckduckgo', label: 'DuckDuckGo' },
  { value: 'yandex', label: 'Yandex' },
];

/** Sozlamalar → Internet (prompt §11): qidiruv tizimi va ixtiyoriy YouTube API kaliti. */
export function InternetSection() {
  const { settings, update } = useSettings();
  const [status, setStatus] = useState<{ hasKey: boolean; secretStorageAvailable: boolean } | null>(null);
  const [key, setKey] = useState('');
  const [test, setTest] = useState<ConnectionTest | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void window.marius.youtube.status().then((r) => alive && r.ok && setStatus(r.data));
    return () => {
      alive = false;
    };
  }, []);

  if (!settings) return null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const r = await window.marius.youtube.setKey(key);
    setSaving(false);
    setKey('');
    setTest(r.ok ? r.data : { ok: false, models: [], message: r.error.message });
    const st = await window.marius.youtube.status();
    if (st.ok) setStatus(st.data);
  };

  const remove = async () => {
    await window.marius.youtube.deleteKey();
    setTest(null);
    const st = await window.marius.youtube.status();
    if (st.ok) setStatus(st.data);
  };

  return (
    <section className="card settings-section" aria-labelledby="web-title">
      <h2 id="web-title">
        <Globe size={18} aria-hidden="true" /> Internet
      </h2>
      <label className="field-row">
        <span>Brauzerdagi qidiruv tizimi</span>
        <select
          className="input"
          aria-label="Qidiruv tizimi"
          value={settings.searchEngine}
          onChange={(e) => void update({ searchEngine: e.target.value as Settings['searchEngine'] })}
        >
          {ENGINES.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </label>

      <h3 className="settings-subtitle">YouTube qidiruvi (ixtiyoriy)</h3>
      <p className="small muted">
        Kalit bo‘lsa, MARIUS YouTube’dan haqiqiy video nomlari, kanallari va havolalarini ko‘rsatadi. Kalitsiz
        faqat brauzerda YouTube qidiruvi ochiladi.
      </p>
      <div className="key-status">
        <KeyRound size={16} aria-hidden="true" />
        {status?.hasKey ? (
          <span>
            YouTube kaliti saqlangan <span className="muted">(shifrlangan)</span>
          </span>
        ) : (
          <span>YouTube kaliti kiritilmagan</span>
        )}
        {status?.hasKey && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void remove()}>
            <Trash2 size={14} aria-hidden="true" /> O‘chirish
          </button>
        )}
      </div>
      <form className="inline-form" onSubmit={(e) => void save(e)}>
        <label htmlFor="youtube-key" className="visually-hidden">
          YouTube API kaliti
        </label>
        <input
          id="youtube-key"
          className="input"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="YouTube Data API kaliti"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <button
          type="submit"
          className="btn btn--primary"
          disabled={!key.trim() || saving || status?.secretStorageAvailable === false}
        >
          {saving ? 'Tekshirilmoqda…' : 'Saqlash'}
        </button>
      </form>
      {test && (
        <p className={`test-result ${test.ok ? 'is-ok' : 'is-fail'}`} role="status">
          {test.ok ? <CheckCircle2 size={16} aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}{' '}
          {test.message}
        </p>
      )}
      <details className="help">
        <summary>YouTube kalitini qanday olaman?</summary>
        <ol>
          <li>
            <a
              href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
              target="_blank"
              rel="noreferrer"
            >
              Google Cloud Console <ExternalLink size={12} aria-hidden="true" />
            </a>{' '}
            sahifasida loyiha tanlang va “YouTube Data API v3” ni yoqing (Enable).
          </li>
          <li>APIs &amp; Services → Credentials → Create credentials → API key.</li>
          <li>Kalitni shu yerga qo‘ying. Bepul kunlik limit bor, oddiy foydalanish uchun yetarli.</li>
        </ol>
      </details>
    </section>
  );
}
