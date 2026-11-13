import { useEffect, useRef, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useConfirmations } from '../../store/confirmations';
import { LEVEL_LABELS } from './labels';

/**
 * Tasdiq kartasi (prompt §20.3): nima qilinadi, nimaga ta'sir qiladi, nima o'zgaradi, xavf darajasi.
 * Tasdiq bir martalik. Standart fokus "Bekor qilish" tugmasida (xavfsiz tanlov), Esc ham bekor qiladi.
 */
export function ConfirmationDialog() {
  const { queue, responding, respond } = useConfirmations();
  const request = queue[0];
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!request) return;
    cancelRef.current?.focus();
    const t = setInterval(() => setNow(Date.now()), 1000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void respond(request.id, false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearInterval(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [request, respond]);

  if (!request) return null;
  const secondsLeft = Math.max(0, Math.round((new Date(request.expiresAt).getTime() - now) / 1000));
  const level = LEVEL_LABELS[request.permissionLevel];

  return (
    <div className="modal-backdrop">
      <div
        className="modal card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-details"
      >
        <header className="modal__header">
          <ShieldAlert size={22} aria-hidden="true" />
          <h2 id="confirm-title">MARIUS ruxsat so‘rayapti</h2>
        </header>
        <dl className="confirm-list" id="confirm-details">
          <dt>Amal</dt>
          <dd>{request.action}</dd>
          <dt>Nimaga</dt>
          <dd>
            <strong>{request.target}</strong>
          </dd>
          <dt>Natija</dt>
          <dd>{request.effect}</dd>
          <dt>Xavf darajasi</dt>
          <dd>
            <span className={`level level--${request.permissionLevel}`}>{level.title}</span>
            <small>{level.hint}</small>
          </dd>
        </dl>
        <p className="small muted">
          Bu tasdiq faqat shu bitta amal uchun.{' '}
          {secondsLeft > 0 ? `${secondsLeft} soniyadan keyin avtomatik bekor qilinadi.` : ''}
        </p>
        <div className="modal__actions">
          <button
            ref={cancelRef}
            type="button"
            className="btn btn--secondary"
            disabled={responding}
            onClick={() => void respond(request.id, false)}
          >
            Bekor qilish
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={responding}
            onClick={() => void respond(request.id, true)}
          >
            Tasdiqlash
          </button>
        </div>
      </div>
    </div>
  );
}
