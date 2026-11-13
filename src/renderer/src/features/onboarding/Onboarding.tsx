import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cloud,
  HardDrive,
  Languages,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { LogoMark } from '../../components/Logo';
import { useSettings } from '../../store/settings';
import { uz } from '../../i18n/uz';

interface Step {
  id: string;
  title: string;
  body: ReactNode;
}

const steps: Step[] = [
  {
    id: 'welcome',
    title: 'Salom! Men MARIUS.',
    body: (
      <>
        <p>
          Men o‘zbek tilida gaplashadigan shaxsiy yordamchingizman. Savollaringizga javob beraman, dasturlarni
          ochaman, fayllarni topaman va eslatib turaman.
        </p>
        <p className="muted">Har bir muhim amaldan oldin sizdan ruxsat so‘rayman.</p>
      </>
    ),
  },
  {
    id: 'language',
    title: 'Til',
    body: (
      <div className="choice is-selected" aria-current="true">
        <Languages size={20} aria-hidden="true" />
        <div>
          <strong>O‘zbek tili (lotin)</strong>
          <small>Asosiy til. Boshqa tillar keyinroq qo‘shiladi.</small>
        </div>
        <Check size={18} aria-hidden="true" className="choice__check" />
      </div>
    ),
  },
  {
    id: 'ai',
    title: 'Sun’iy intellekt',
    body: (
      <>
        <p>MARIUS ikki xil bepul AI bilan ishlaydi. Ularni keyinroq Sozlamalarda ulaysiz:</p>
        <div className="choice">
          <Cloud size={20} aria-hidden="true" />
          <div>
            <strong>Google Gemini (internet orqali)</strong>
            <small>O‘zbek tilini yaxshi tushunadi. Bepul kalitni Google’dan olasiz.</small>
          </div>
        </div>
        <div className="choice">
          <HardDrive size={20} aria-hidden="true" />
          <div>
            <strong>Lokal AI (Ollama, internetsiz)</strong>
            <small>To‘liq kompyuteringizda ishlaydi. Kuchli kompyuter talab qiladi.</small>
          </div>
        </div>
        <p className="muted">
          AI ulanish 2-bosqichda qo‘shiladi. Hozircha bu qadamni o‘tkazib yuborishingiz mumkin.
        </p>
      </>
    ),
  },
  {
    id: 'privacy',
    title: 'Maxfiylik',
    body: (
      <ul className="checklist">
        <li>
          <ShieldCheck size={18} aria-hidden="true" /> Mikrofon faqat siz tugmani bosganingizda yoqiladi va 30
          soniyadan keyin o‘zi o‘chadi. Ovoz yozib olinmaydi.
        </li>
        <li>
          <ShieldCheck size={18} aria-hidden="true" /> Ekran tasviri faqat sizning ruxsatingiz bilan olinadi.
        </li>
        <li>
          <ShieldCheck size={18} aria-hidden="true" /> Fayllar faqat siz tanlagan papkalarda qidiriladi.
        </li>
        <li>
          <ShieldCheck size={18} aria-hidden="true" /> Ma’lumotlaringiz shu kompyuterda saqlanadi, ularni
          ko‘rish va o‘chirish mumkin.
        </li>
      </ul>
    ),
  },
  {
    id: 'ready',
    title: 'Hammasi tayyor',
    body: (
      <>
        <p>MARIUS ishga tayyor. Sozlamalarni istalgan vaqtda o‘zgartirishingiz mumkin.</p>
        <p className="muted">Bu birinchi versiya: ko‘p imkoniyatlar bosqichma-bosqich qo‘shiladi.</p>
      </>
    ),
  },
];

export function Onboarding() {
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const update = useSettings((s) => s.update);
  const error = useSettings((s) => s.error);
  const step = steps[index]!;
  const isLast = index === steps.length - 1;

  const finish = async () => {
    setSaving(true);
    const ok = await update({ onboardingCompleted: true });
    if (!ok) setSaving(false);
  };

  return (
    <div className="onboarding">
      <div
        className="onboarding__panel card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <div className="onboarding__brand">
          <LogoMark size={40} />
          <span className="logo__text">MARIUS</span>
        </div>

        <ol className="stepper" aria-label="Qadamlar">
          {steps.map((s, i) => (
            <li
              key={s.id}
              className={i === index ? 'is-current' : i < index ? 'is-done' : ''}
              aria-current={i === index ? 'step' : undefined}
            >
              <span className="visually-hidden">
                {i + 1}-qadam: {s.title}
              </span>
            </li>
          ))}
        </ol>

        <h1 id="onboarding-title" className="onboarding__title">
          {index === 0 && <Sparkles size={22} aria-hidden="true" />} {step.title}
        </h1>
        <div className="onboarding__body">{step.body}</div>

        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}

        <div className="onboarding__actions">
          {index > 0 ? (
            <button type="button" className="btn btn--ghost" onClick={() => setIndex(index - 1)}>
              <ArrowLeft size={16} aria-hidden="true" />
              {uz.common.back}
            </button>
          ) : (
            <span />
          )}
          {isLast ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void finish()}
              disabled={saving}
            >
              {uz.common.finish}
              <Check size={16} aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={() => setIndex(index + 1)} autoFocus>
              {step.id === 'ai' ? uz.common.later : uz.common.next}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
