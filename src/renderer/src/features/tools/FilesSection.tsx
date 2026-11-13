import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ExternalLink,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Loader2,
  Plus,
  Search,
  X,
} from 'lucide-react';
import type { ActionResult, AllowedFolderInfo, FileHitInfo, FolderSuggestion } from '@shared/ipc';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

/** Kompyuter → Fayllar (prompt §10, §18): ruxsatli papkalar, qidiruv, ochish. */
export function FilesSection({ onResult }: { onResult: (r: ActionResult) => void }) {
  const [folders, setFolders] = useState<AllowedFolderInfo[]>([]);
  const [suggestions, setSuggestions] = useState<FolderSuggestion[]>([]);
  const [query, setQuery] = useState('');
  const [ext, setExt] = useState('');
  const [days, setDays] = useState('');
  const [folderId, setFolderId] = useState('');
  const [results, setResults] = useState<FileHitInfo[] | null>(null);
  const [meta, setMeta] = useState<{ scanned: number; truncated: boolean } | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [f, s] = await Promise.all([window.marius.files.listFolders(), window.marius.files.suggestions()]);
    if (f.ok) setFolders(f.data);
    if (s.ok) setSuggestions(s.data);
  }, []);

  useEffect(() => {
    let alive = true;
    void Promise.all([window.marius.files.listFolders(), window.marius.files.suggestions()]).then(
      ([f, s]) => {
        if (!alive) return;
        if (f.ok) setFolders(f.data);
        if (s.ok) setSuggestions(s.data);
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  const apply = async (
    p: Promise<{ ok: true; data: AllowedFolderInfo[] } | { ok: false; error: { message: string } }>,
  ) => {
    const r = await p;
    if (r.ok) {
      setFolders(r.data);
      setError(null);
    } else setError(r.error.message);
    void refresh();
  };

  const search = async (e: FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setError(null);
    const r = await window.marius.files.search({
      ...(query.trim() ? { query: query.trim() } : {}),
      ...(ext.trim() ? { extension: ext.trim().replace(/^\./, '') } : {}),
      ...(folderId ? { folderId } : {}),
      ...(days ? { modifiedWithinDays: Number(days) } : {}),
    });
    setSearching(false);
    if (r.ok) {
      setResults(r.data.results);
      setMeta({ scanned: r.data.scanned, truncated: r.data.truncated });
    } else setError(r.error.message);
  };

  const act = async (
    p: Promise<{ ok: true; data: ActionResult } | { ok: false; error: { message: string } }>,
  ) => {
    const r = await p;
    onResult(r.ok ? r.data : { ok: false, message: r.error.message, verified: null });
  };

  const notAdded = suggestions.filter((s) => !s.added);

  return (
    <section className="card settings-section" aria-labelledby="files-title">
      <h2 id="files-title">
        <Folder size={18} aria-hidden="true" /> Fayllar
      </h2>
      <p className="small muted">
        MARIUS faqat siz ruxsat bergan papkalarda fayl qidiradi va ular bilan ishlaydi. Fayl mazmuni
        o‘qilmaydi va AI’ga yuborilmaydi. Fayl o‘chirish imkoniyati yo‘q.
      </p>

      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}

      <div>
        <strong className="small">Ruxsat berilgan papkalar</strong>
        {folders.length === 0 ? (
          <p className="small muted">Hali papka qo‘shilmagan.</p>
        ) : (
          <ul className="item-list item-list--compact" aria-label="Ruxsat berilgan papkalar">
            {folders.map((f) => (
              <li key={f.id}>
                <span className="item-list__name" title={f.path}>
                  <FolderOpen size={14} aria-hidden="true" /> {f.label}{' '}
                  <small className="muted">· {f.path}</small>
                  {!f.exists && <small className="status--error"> · topilmadi</small>}
                </span>
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  onClick={() => void apply(window.marius.files.removeFolder(f.id))}
                  aria-label={`${f.label} papkasi ruxsatini olib tashlash`}
                  title="Ruxsatni olib tashlash"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="chips">
          {notAdded.map((s) => (
            <button
              key={s.key}
              type="button"
              className="chip-btn"
              onClick={() => void apply(window.marius.files.addSuggestedFolder(s.key))}
              title={s.path}
            >
              <Plus size={12} aria-hidden="true" /> {s.label}
            </button>
          ))}
          <button
            type="button"
            className="chip-btn"
            onClick={() => void apply(window.marius.files.addFolderFromDialog())}
          >
            <FolderPlus size={12} aria-hidden="true" /> Boshqa papka…
          </button>
        </div>
      </div>

      {folders.length > 0 && (
        <form className="file-search" onSubmit={(e) => void search(e)} aria-label="Fayl qidirish">
          <label className="search search--grow">
            <Search size={16} aria-hidden="true" />
            <span className="visually-hidden">Fayl nomi</span>
            <input
              className="search__input"
              placeholder="Fayl nomi (masalan, dars jadvali)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <input
            className="input input--sm"
            aria-label="Kengaytma"
            placeholder="pdf"
            value={ext}
            onChange={(e) => setExt(e.target.value)}
          />
          <select
            className="input input--sm"
            aria-label="Papka"
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
          >
            <option value="">Barcha papkalar</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            className="input input--sm"
            aria-label="O‘zgartirilgan sana"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          >
            <option value="">Istalgan vaqt</option>
            <option value="1">Bugun</option>
            <option value="7">Oxirgi hafta</option>
            <option value="30">Oxirgi oy</option>
          </select>
          <button
            type="submit"
            className="btn btn--primary btn--sm"
            disabled={searching || (!query.trim() && !ext.trim() && !days)}
          >
            {searching ? (
              <Loader2 size={14} className="spin" aria-hidden="true" />
            ) : (
              <Search size={14} aria-hidden="true" />
            )}{' '}
            Qidirish
          </button>
        </form>
      )}

      {results && (
        <>
          <p className="small muted" role="status">
            {results.length} ta natija · {meta?.scanned ?? 0} ta element ko‘rib chiqildi
            {meta?.truncated ? ' · natijalar cheklangan, qidiruvni aniqlashtiring' : ''}
          </p>
          <ul className="item-list" aria-label="Qidiruv natijalari">
            {results.map((f) => (
              <li key={f.path}>
                <span className="item-list__name" title={f.path}>
                  {f.isDirectory ? (
                    <Folder size={14} aria-hidden="true" />
                  ) : (
                    <FileText size={14} aria-hidden="true" />
                  )}{' '}
                  {f.name}
                  <small className="muted">
                    {' '}
                    · {new Date(f.modifiedAt).toLocaleDateString('uz-UZ')}
                    {!f.isDirectory && ` · ${formatSize(f.size)}`} · {f.folder}
                  </small>
                </span>
                <span className="row-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => void act(window.marius.files.showInFolder(f.path))}
                  >
                    Joylashuvi
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => void act(window.marius.files.open(f.path))}
                    aria-label={`${f.name} ni ochish`}
                  >
                    <ExternalLink size={14} aria-hidden="true" /> Ochish
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
