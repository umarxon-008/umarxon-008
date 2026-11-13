import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useSettings } from '../../store/settings';
import { useChat } from '../../store/chat';

/** Suhbat tarixini saqlash siyosati va tozalash. */
export function PrivacySection() {
  const { settings, update } = useSettings();
  const clearAll = useChat((s) => s.clearAll);
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);
  if (!settings) return null;

  return (
    <section className="card settings-section" aria-labelledby="privacy-title">
      <h2 id="privacy-title">Maxfiylik va tarix</h2>
      <label className="toggle">
        <input
          type="checkbox"
          checked={settings.saveHistory}
          onChange={(e) => void update({ saveHistory: e.target.checked })}
        />
        <span className="toggle__track" aria-hidden="true" />
        <span>
          <strong>Suhbat tarixini saqlash</strong>
          <small>
            Yoqilgan bo‘lsa, suhbatlar shu kompyuterdagi bazada saqlanadi. O‘chirilsa, yangi suhbatlar faqat
            ilova ochiq turgan paytda xotirada turadi va yopilganda yo‘qoladi.
          </small>
        </span>
      </label>

      <div className="row">
        <div>
          <strong>Barcha suhbatlarni o‘chirish</strong>
          <small>
            Saqlangan va xotiradagi barcha suhbatlar butunlay o‘chiriladi. Bu amalni qaytarib bo‘lmaydi.
          </small>
        </div>
        {confirming ? (
          <span className="confirm-inline" role="group" aria-label="Tasdiqlash">
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={() =>
                void clearAll().then(() => {
                  setConfirming(false);
                  setCleared(true);
                })
              }
            >
              Ha, o‘chirish
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirming(false)}>
              Bekor qilish
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              setConfirming(true);
              setCleared(false);
            }}
          >
            <Trash2 size={16} aria-hidden="true" />
            O‘chirish
          </button>
        )}
      </div>
      {cleared && (
        <p className="small" role="status">
          ✓ Barcha suhbatlar o‘chirildi.
        </p>
      )}
    </section>
  );
}
