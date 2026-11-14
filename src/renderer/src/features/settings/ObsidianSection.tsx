import { useEffect, useState } from 'react';
import { BookOpen, FolderOpen, FolderPlus, Unplug } from 'lucide-react';
import type { ObsidianStatus } from '@shared/ipc';

type Perm = 'read' | 'create' | 'append';
const PERMS: { key: Perm; title: string; hint: string }[] = [
  {
    key: 'read',
    title: 'O‘qish',
    hint: 'Note’larni qidirish. Note matnini AI’ga yuborishdan oldin har safar ruxsat so‘raladi.',
  },
  {
    key: 'create',
    title: 'Yangi note yaratish',
    hint: 'Faqat siz so‘raganingizda, oldindan ko‘rish va tasdiq bilan. Mavjud note ustidan yozilmaydi.',
  },
  {
    key: 'append',
    title: 'Note oxiriga qo‘shish',
    hint: 'Mavjud matn o‘zgarmaydi, faqat oxiriga qo‘shiladi (tasdiq bilan).',
  },
];

/** Sozlamalar → Integratsiyalar → Obsidian (prompt v2.1 §4). Hammasi standart holatda o'chiq. */
export function ObsidianSection() {
  const [s, setS] = useState<ObsidianStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void window.marius.obsidian.status().then((r) => alive && r.ok && setS(r.data));
    return () => {
      alive = false;
    };
  }, []);

  const apply = async (p: ReturnType<typeof window.marius.obsidian.status>) => {
    const r = await p;
    if (r.ok) {
      setS(r.data);
      setError(null);
    } else setError(r.error.message);
  };

  if (!s) return null;

  return (
    <section className="card settings-section" aria-labelledby="obsidian-title">
      <h2 id="obsidian-title">
        <BookOpen size={18} aria-hidden="true" /> Integratsiyalar · Obsidian
      </h2>
      <p className="small muted">
        Ixtiyoriy. Obsidian — Markdown qaydlar ilovasi. MARIUS tanlangan Vault papkasidagi .md fayllar bilan
        ishlaydi. Obsidian o‘rnatilmagan bo‘lsa ham MARIUS to‘liq ishlaydi. Hech narsa avtomatik
        sinxronlanmaydi yoki cloud’ga yuklanmaydi.
      </p>
      <p className="small">
        Obsidian: <strong>{s.obsidianInstalled ? 'o‘rnatilgan' : 'topilmadi (ixtiyoriy)'}</strong>
      </p>
      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}

      {s.vaultPath ? (
        <>
          <dl className="info-list">
            <dt>Vault</dt>
            <dd className="mono">{s.vaultPath}</dd>
            <dt>Holat</dt>
            <dd>
              {s.accessible
                ? s.enabled
                  ? `ulangan · ${s.noteCount ?? 0} ta note`
                  : 'ulangan, integratsiya o‘chiq'
                : 'papka topilmadi'}
            </dd>
            <dt>Oxirgi indekslash</dt>
            <dd>{s.lastIndexedAt ? new Date(s.lastIndexedAt).toLocaleString('uz-UZ') : '—'}</dd>
          </dl>
          <label className="toggle">
            <input
              type="checkbox"
              checked={s.enabled}
              onChange={(e) => void apply(window.marius.obsidian.update({ enabled: e.target.checked }))}
            />
            <span className="toggle__track" aria-hidden="true" />
            <span>
              <strong>Obsidian integratsiyasi yoqilgan</strong>
            </span>
          </label>
          {s.enabled &&
            PERMS.map((p) => (
              <label key={p.key} className="toggle toggle--indent">
                <input
                  type="checkbox"
                  checked={s[p.key]}
                  onChange={(e) => void apply(window.marius.obsidian.update({ [p.key]: e.target.checked }))}
                />
                <span className="toggle__track" aria-hidden="true" />
                <span>
                  <strong>{p.title}</strong>
                  <small>{p.hint}</small>
                </span>
              </label>
            ))}
          <div className="row-actions">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => void window.marius.obsidian.open()}
            >
              <FolderOpen size={14} aria-hidden="true" />{' '}
              {s.obsidianInstalled ? 'Obsidian’da ochish' : 'Papkani ochish'}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => void apply(window.marius.obsidian.clearIndex())}
            >
              Indeksni tozalash
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => void apply(window.marius.obsidian.disconnect())}
            >
              <Unplug size={14} aria-hidden="true" /> Vault’ni uzish
            </button>
          </div>
        </>
      ) : (
        <div className="row-actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => void apply(window.marius.obsidian.chooseVault('existing'))}
          >
            <FolderOpen size={16} aria-hidden="true" /> Mavjud Vault’ni tanlash
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => void apply(window.marius.obsidian.chooseVault('create'))}
          >
            <FolderPlus size={16} aria-hidden="true" /> Yangi “MARIUS Vault” yaratish
          </button>
        </div>
      )}
    </section>
  );
}
