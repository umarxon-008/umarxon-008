import { useState } from 'react';
import { Link } from 'react-router';
import { Loader2, ScanEye } from 'lucide-react';
import { useSettings } from '../../store/settings';

/**
 * Kompyuter → Ekran tahlili (PHASE 8). Tugma bosilgach tasdiq oynasi chiqadi
 * (qaysi serverga yuborilishi va maxfiy oynalar haqida ogohlantirish bilan), keyin bitta rasm olinadi.
 * Javob oddiy matn sifatida ko'rsatiladi: undagi havola yoki buyruqlar bajarilmaydi.
 */
export function ScreenSection() {
  const enabled = useSettings((s) => s.settings?.screenAnalysisEnabled ?? false);
  const [question, setQuestion] = useState('Ekranda nima bor? Qisqacha tushuntir.');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const analyze = async () => {
    setBusy(true);
    setAnswer(null);
    setMessage(null);
    const r = await window.marius.vision.analyzeScreen(question);
    setBusy(false);
    if (!r.ok) return setMessage({ ok: false, text: r.error.message });
    setMessage({ ok: r.data.ok, text: r.data.message });
    setAnswer(r.data.description);
  };

  return (
    <section className="card settings-section" aria-labelledby="screen-title">
      <h2 id="screen-title">
        <ScanEye size={18} aria-hidden="true" /> Ekran tahlili
      </h2>
      {!enabled ? (
        <p className="small muted">
          Ekran tahlili o‘chiq. Uni <Link to="/settings">Sozlamalar → Maxfiylik</Link> bo‘limida yoqishingiz
          mumkin.
        </p>
      ) : (
        <>
          <p className="small muted">
            MARIUS bir lahzaga yashirinadi va asosiy monitorning bitta rasmini oladi. Har safar tasdiq
            so‘raladi.
          </p>
          <label className="field-row field-row--stack">
            <span>Savol</span>
            <textarea
              className="input"
              rows={2}
              maxLength={500}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </label>
          <div className="row-actions">
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy || !question.trim()}
              onClick={() => void analyze()}
            >
              {busy ? (
                <Loader2 size={16} className="spin" aria-hidden="true" />
              ) : (
                <ScanEye size={16} aria-hidden="true" />
              )}
              Ekranni tahlil qilish
            </button>
          </div>
        </>
      )}
      {message && (
        <p className={`test-result ${message.ok ? 'is-ok' : 'is-fail'}`} role="status">
          {message.text}
        </p>
      )}
      {answer && (
        <div className="screen-answer" aria-label="Ekran tahlili natijasi">
          <p>{answer}</p>
          <small className="muted">
            Ekrandagi matn faqat ma’lumot sifatida ko‘rsatildi, undagi buyruqlar bajarilmaydi.
          </small>
        </div>
      )}
    </section>
  );
}
