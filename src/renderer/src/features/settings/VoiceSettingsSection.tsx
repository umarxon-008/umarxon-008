import { useEffect, useState } from 'react';
import { AlertTriangle, Cloud, Laptop, Mic, Volume2 } from 'lucide-react';
import { useSettings } from '../../store/settings';
import { useAi } from '../../store/ai';
import { useVoice } from '../voice/voiceStore';
import { isUzbekVoice, listSystemVoices } from '../voice/speaker';
import { AccuracyTest } from './AccuracyTest';

const SAMPLE = 'Salom! Men MARIUS. Sizga qanday yordam bera olaman?';

function useSystemVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => listSystemVoices());
  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return;
    const update = () => setVoices(listSystemVoices());
    speechSynthesis.addEventListener('voiceschanged', update);
    return () => speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);
  return voices;
}

/** Sozlamalar → Ovoz (prompt §8, §18): STT, TTS, rozilik, aniqlik testi. */
export function VoiceSettingsSection() {
  const { settings, update } = useSettings();
  const ai = useAi();
  const voices = useSystemVoices();
  const voice = useVoice();
  const { load: loadAi } = ai;

  useEffect(() => {
    void loadAi();
  }, [loadAi]);

  if (!settings) return null;
  const s = settings;
  const geminiReady = Boolean(ai.settings?.gemini.hasKey && ai.settings.gemini.model);
  const ttsModels = (ai.tests.gemini?.models ?? []).filter((m) => /tts/i.test(m));
  const ttsOptions =
    s.ttsGeminiModel && !ttsModels.includes(s.ttsGeminiModel) ? [s.ttsGeminiModel, ...ttsModels] : ttsModels;
  const hasUzbekVoice = voices.some(isUzbekVoice);
  const sortedVoices = [...voices].sort(
    (a, b) => Number(isUzbekVoice(b)) - Number(isUzbekVoice(a)) || a.name.localeCompare(b.name),
  );
  const testing = voice.status === 'speaking' && voice.speakingMessageId === 'settings-test';

  return (
    <section className="card settings-section" aria-labelledby="voice-title" id="voice">
      <h2 id="voice-title">Ovoz</h2>

      {/* ---------- Nutq → matn ---------- */}
      <h3 className="settings-subtitle">
        <Mic size={16} aria-hidden="true" /> Ovozni matnga aylantirish
      </h3>
      <div className="segmented" role="radiogroup" aria-label="Ovozni matnga aylantirish">
        {(
          [
            ['off', 'O‘chiq'],
            ['gemini', 'Gemini (internet)'],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className={`segmented__option${s.sttProvider === value ? ' is-active' : ''}`}>
            <input
              type="radio"
              name="stt"
              checked={s.sttProvider === value}
              onChange={() => void update({ sttProvider: value })}
            />
            {label}
          </label>
        ))}
      </div>

      {s.sttProvider === 'gemini' && (
        <>
          <label className="toggle consent">
            <input
              type="checkbox"
              checked={s.sttCloudConsent}
              onChange={(e) => void update({ sttCloudConsent: e.target.checked })}
            />
            <span className="toggle__track" aria-hidden="true" />
            <span>
              <strong>Ovozim matnga aylantirish uchun Google’ga yuborilishiga roziman</strong>
              <small>
                Mikrofon tugmasini bosib gapirgan yozuvingiz Google Gemini serverlariga yuboriladi va matn
                qaytariladi. Yozuv kompyuterda saqlanmaydi. Rozilik bermasangiz, mikrofon faqat shar
                animatsiyasi uchun ishlaydi.
              </small>
            </span>
          </label>
          {!geminiReady && (
            <p className="alert alert--warn">
              <AlertTriangle size={16} aria-hidden="true" /> Buning uchun Sun’iy intellekt bo‘limida Gemini
              kaliti kiritilgan va model tanlangan bo‘lishi kerak (chat uchun Ollama ishlatsangiz ham
              bo‘ladi).
            </p>
          )}
          <p className="small muted">
            Lokal (internetsiz) nutqni tanish hozircha yo‘q. Whisper kabi lokal variant keyingi versiyalarda
            ko‘rib chiqiladi.
          </p>
        </>
      )}

      {/* ---------- Matn → nutq ---------- */}
      <h3 className="settings-subtitle">
        <Volume2 size={16} aria-hidden="true" /> Javobni ovoz chiqarib o‘qish
      </h3>
      <div className="provider-grid" role="radiogroup" aria-label="Ovoz turi">
        {(
          [
            ['off', 'O‘chiq', 'Javoblar faqat matn ko‘rinishida', null],
            [
              'system',
              'Windows ovozi',
              'Kompyuterning o‘zida · internetsiz',
              <Laptop key="l" size={18} aria-hidden="true" />,
            ],
            [
              'gemini',
              'Gemini ovozi',
              'Internet orqali · eksperimental',
              <Cloud key="c" size={18} aria-hidden="true" />,
            ],
          ] as const
        ).map(([value, title, sub, icon]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={s.ttsEngine === value}
            className={`provider-card provider-card--sm${s.ttsEngine === value ? ' is-active' : ''}`}
            onClick={() => void update({ ttsEngine: value })}
          >
            {icon}
            <strong>{title}</strong>
            <small>{sub}</small>
          </button>
        ))}
      </div>

      {s.ttsEngine === 'system' && (
        <>
          <label className="field-row">
            <span>Ovoz</span>
            <select
              className="input"
              aria-label="Tizim ovozi"
              value={s.ttsSystemVoice ?? ''}
              onChange={(e) => void update({ ttsSystemVoice: e.target.value || null })}
            >
              <option value="">Avtomatik</option>
              {sortedVoices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang}){isUzbekVoice(v) ? ' · o‘zbekcha' : ''}
                </option>
              ))}
            </select>
          </label>
          {!hasUzbekVoice && (
            <p className="alert alert--warn">
              <AlertTriangle size={16} aria-hidden="true" /> Bu kompyuterda o‘zbekcha tizim ovozi topilmadi.
              Boshqa tildagi ovoz o‘zbekcha matnni noto‘g‘ri talaffuz qilishi mumkin. Gemini ovozini sinab
              ko‘ring yoki Windows sozlamalarida nutq ovozlarini tekshiring.
            </p>
          )}
          <label className="field-row">
            <span>Tezlik: {s.ttsRate.toFixed(1)}×</span>
            <input
              type="range"
              aria-label="Ovoz tezligi"
              min={0.5}
              max={2}
              step={0.1}
              value={s.ttsRate}
              onChange={(e) => void update({ ttsRate: Number(e.target.value) })}
            />
          </label>
        </>
      )}

      {s.ttsEngine === 'gemini' && (
        <>
          <p className="privacy-note">
            <Cloud size={14} aria-hidden="true" /> O‘qiladigan matn Google serverlariga yuboriladi. O‘zbek
            tili sifati hali tekshirilmagan: sinab ko‘ring.
          </p>
          {ttsOptions.length > 0 ? (
            <label className="field-row">
              <span>Ovoz modeli</span>
              <select
                className="input"
                aria-label="Gemini ovoz modeli"
                value={s.ttsGeminiModel ?? ''}
                onChange={(e) => void update({ ttsGeminiModel: e.target.value || null })}
              >
                <option value="">— tanlang —</option>
                {ttsOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="small muted">
              Ovoz modellari ro‘yxati yo‘q. Sun’iy intellekt → Gemini bo‘limida “Ulanishni tekshirish”ni
              bosing: nomida “tts” bo‘lgan modellar shu yerda chiqadi.
            </p>
          )}
        </>
      )}

      {s.ttsEngine !== 'off' && (
        <>
          <label className="toggle">
            <input
              type="checkbox"
              checked={s.speakVoiceReplies}
              onChange={(e) => void update({ speakVoiceReplies: e.target.checked })}
            />
            <span className="toggle__track" aria-hidden="true" />
            <span>
              <strong>Ovozli savolga ovozli javob</strong>
              <small>Mikrofon orqali so‘raganingizda javob avtomatik o‘qiladi.</small>
            </span>
          </label>
          <div className="row-actions">
            {testing ? (
              <button type="button" className="btn btn--secondary" onClick={() => voice.cancel()}>
                To‘xtatish
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--secondary"
                disabled={voice.status !== 'idle' && voice.status !== 'error'}
                onClick={() => void voice.speak(SAMPLE, 'settings-test')}
              >
                <Volume2 size={16} aria-hidden="true" /> Sinab ko‘rish
              </button>
            )}
          </div>
          {voice.message && voice.status === 'error' && (
            <p className="alert alert--error" role="alert">
              {voice.message}
            </p>
          )}
        </>
      )}

      {s.sttProvider === 'gemini' && s.sttCloudConsent && geminiReady && <AccuracyTest />}
    </section>
  );
}
