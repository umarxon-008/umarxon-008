import { useState } from 'react';
import { DatabaseBackup, History } from 'lucide-react';

/** Zaxira nusxa va tiklash (prompt §22, v2.1 §8). Obsidian Vault bu zaxiraga kirmaydi. */
export function BackupControls() {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [busy, setBusy] = useState(false);

  const backup = async () => {
    setBusy(true);
    const r = await window.marius.data.backup();
    setBusy(false);
    if (r.ok) setMessage(r.data.message ? { ok: r.data.saved, text: r.data.message } : null);
    else setMessage({ ok: false, text: r.error.message });
  };

  const restore = async () => {
    setConfirmRestore(false);
    setBusy(true);
    const r = await window.marius.data.restore();
    setBusy(false);
    setMessage(r.ok ? { ok: r.data.scheduled, text: r.data.message } : { ok: false, text: r.error.message });
  };

  return (
    <>
      <h3 className="settings-subtitle">Zaxira nusxa</h3>
      <p className="small muted">
        Suhbatlar, eslatmalar, xotira va sozlamalar bitta faylga saqlanadi. API kalitlari zaxiraga kirmaydi
        (ular faqat shu kompyuterda ishlaydi). Obsidian Vault — alohida oddiy papka, uni o‘zingiz nusxalaysiz.
      </p>
      <div className="row-actions">
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          disabled={busy}
          onClick={() => void backup()}
        >
          <DatabaseBackup size={14} aria-hidden="true" /> Zaxira nusxa olish
        </button>
        {confirmRestore ? (
          <span className="confirm-inline">
            <button type="button" className="btn btn--danger btn--sm" onClick={() => void restore()}>
              Ha, tiklash
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmRestore(false)}>
              Yo‘q
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={busy}
            onClick={() => setConfirmRestore(true)}
          >
            <History size={14} aria-hidden="true" /> Zaxiradan tiklash…
          </button>
        )}
      </div>
      {confirmRestore && (
        <p className="alert alert--warn">
          Diqqat: hozirgi suhbatlar, eslatmalar va xotira tanlangan zaxira bilan almashtiriladi. Tiklashdan
          oldin joriy ma’lumotlarning nusxasi avtomatik saqlanadi. MARIUS qayta ishga tushadi.
        </p>
      )}
      {message && (
        <p className={`small ${message.ok ? 'status--success' : 'status--error'}`} role="status">
          {message.text}
        </p>
      )}
    </>
  );
}
