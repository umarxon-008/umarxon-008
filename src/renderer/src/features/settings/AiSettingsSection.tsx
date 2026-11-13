import { useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Cloud,
  ExternalLink,
  HardDrive,
  KeyRound,
  PlugZap,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { ProviderId } from '@shared/ipc';
import { useAi } from '../../store/ai';

function TestResult({ provider }: { provider: ProviderId }) {
  const result = useAi((s) => s.tests[provider]);
  if (!result) return null;
  return (
    <p className={`test-result ${result.ok ? 'is-ok' : 'is-fail'}`} role="status">
      {result.ok ? <CheckCircle2 size={16} aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}
      {result.message}
    </p>
  );
}

function ModelSelect({ provider, value }: { provider: ProviderId; value: string | null }) {
  const { tests, update } = useAi();
  const models = tests[provider]?.models ?? [];
  const options = value && !models.includes(value) ? [value, ...models] : models;
  if (options.length === 0) {
    return (
      <p className="muted small">Modelni tanlash uchun avval “Ulanishni tekshirish” tugmasini bosing.</p>
    );
  }
  return (
    <label className="field-row">
      <span>Model</span>
      <select
        className="input"
        aria-label="AI model"
        value={value ?? ''}
        onChange={(e) =>
          void update(
            provider === 'gemini'
              ? { geminiModel: e.target.value || null }
              : { ollamaModel: e.target.value || null },
          )
        }
      >
        <option value="">— tanlang —</option>
        {options.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AiSettingsSection() {
  const { settings, error, testing, load, update, setGeminiKey, deleteGeminiKey, test } = useAi();
  const [key, setKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  if (!settings) return null;
  const s = settings;
  const urlValue = ollamaUrl ?? s.ollama.baseUrl;

  const saveKey = async (e: FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    if (await setGeminiKey(key)) {
      setKey(''); // kalit renderer xotirasida qolmaydi
      setKeySaved(true);
      await test('gemini');
    }
  };

  const saveUrl = async (e: FormEvent) => {
    e.preventDefault();
    if (await update({ ollamaBaseUrl: urlValue.trim() })) setOllamaUrl(null);
  };

  const choose = (provider: ProviderId) => void update({ provider });

  return (
    <section className="card settings-section" aria-labelledby="ai-title" id="ai">
      <h2 id="ai-title">Sun’iy intellekt</h2>
      <p className="muted">
        MARIUS ikki xil bepul AI bilan ishlaydi. Bittasini tanlang. Kalit va sozlamalar faqat shu kompyuterda
        saqlanadi.
      </p>

      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}

      <div className="provider-grid" role="radiogroup" aria-label="AI provayder">
        <button
          type="button"
          role="radio"
          aria-checked={s.provider === 'gemini'}
          className={`provider-card${s.provider === 'gemini' ? ' is-active' : ''}`}
          onClick={() => choose('gemini')}
        >
          <Cloud size={20} aria-hidden="true" />
          <strong>Google Gemini</strong>
          <small>Internet orqali · o‘zbek tilini yaxshi tushunadi · bepul kalit bilan</small>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={s.provider === 'ollama'}
          className={`provider-card${s.provider === 'ollama' ? ' is-active' : ''}`}
          onClick={() => choose('ollama')}
        >
          <HardDrive size={20} aria-hidden="true" />
          <strong>Ollama (lokal)</strong>
          <small>Kompyuterning o‘zida · internetsiz · kuchli kompyuter kerak</small>
        </button>
      </div>

      {s.provider === 'gemini' && (
        <div className="provider-panel">
          <p className="privacy-note">
            <Cloud size={14} aria-hidden="true" /> Gemini ishlatilganda yozgan xabarlaringiz javob olish uchun
            Google serverlariga yuboriladi. Maxfiy ma’lumot yozmang.
          </p>

          {!s.secretStorageAvailable && (
            <p className="alert alert--error">
              <ShieldAlert size={16} aria-hidden="true" /> Bu kompyuterda kalitni shifrlab saqlash imkoni
              yo‘q, shuning uchun kalit saqlanmaydi.
            </p>
          )}

          <div className="key-status">
            <KeyRound size={16} aria-hidden="true" />
            {s.gemini.hasKey ? (
              <span>
                API kalit saqlangan <span className="muted">(shifrlangan, qayta ko‘rsatilmaydi)</span>
              </span>
            ) : (
              <span>API kalit kiritilmagan</span>
            )}
            {s.gemini.hasKey && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => void deleteGeminiKey()}>
                <Trash2 size={14} aria-hidden="true" /> Kalitni o‘chirish
              </button>
            )}
          </div>

          <form className="inline-form" onSubmit={(e) => void saveKey(e)}>
            <label htmlFor="gemini-key" className="visually-hidden">
              Gemini API kalit
            </label>
            <input
              id="gemini-key"
              className="input"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={
                s.gemini.hasKey ? 'Yangi kalit bilan almashtirish' : 'API kalitni shu yerga qo‘ying'
              }
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setKeySaved(false);
              }}
            />
            <button
              type="submit"
              className="btn btn--primary"
              disabled={!key.trim() || !s.secretStorageAvailable}
            >
              Saqlash
            </button>
          </form>
          {keySaved && <p className="small muted">Kalit shifrlab saqlandi.</p>}

          <details className="help">
            <summary>Bepul kalitni qanday olaman?</summary>
            <ol>
              <li>
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                  Google AI Studio <ExternalLink size={12} aria-hidden="true" />
                </a>{' '}
                sahifasini oching va Google akkauntingiz bilan kiring.
              </li>
              <li>“Create API key” tugmasini bosing.</li>
              <li>Kalitni nusxalab, yuqoridagi maydonga qo‘ying va “Saqlash”ni bosing.</li>
            </ol>
          </details>

          <div className="row-actions">
            <button
              type="button"
              className="btn btn--secondary"
              disabled={!s.gemini.hasKey || testing === 'gemini'}
              onClick={() => void test('gemini')}
            >
              <PlugZap size={16} aria-hidden="true" />
              {testing === 'gemini' ? 'Tekshirilmoqda…' : 'Ulanishni tekshirish'}
            </button>
          </div>
          <TestResult provider="gemini" />
          {s.gemini.hasKey && <ModelSelect provider="gemini" value={s.gemini.model} />}
        </div>
      )}

      {s.provider === 'ollama' && (
        <div className="provider-panel">
          <p className="privacy-note">
            <HardDrive size={14} aria-hidden="true" />
            {s.ollama.isLocal
              ? ' Ollama shu kompyuterda ishlaydi: xabarlaringiz kompyuterdan chiqmaydi.'
              : ' Diqqat: bu manzil boshqa kompyuterda. Xabarlar tarmoq orqali o‘sha kompyuterga yuboriladi.'}
          </p>
          <form className="inline-form" onSubmit={(e) => void saveUrl(e)}>
            <label htmlFor="ollama-url" className="field-row field-row--grow">
              <span>Ollama manzili</span>
              <input
                id="ollama-url"
                className="input"
                spellCheck={false}
                value={urlValue}
                onChange={(e) => setOllamaUrl(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="btn btn--secondary"
              disabled={urlValue.trim() === s.ollama.baseUrl}
            >
              Saqlash
            </button>
          </form>

          <details className="help">
            <summary>Ollama’ni qanday o‘rnataman?</summary>
            <ol>
              <li>
                <a href="https://ollama.com/download" target="_blank" rel="noreferrer">
                  ollama.com <ExternalLink size={12} aria-hidden="true" />
                </a>{' '}
                saytidan Windows uchun o‘rnatuvchini yuklab, o‘rnating.
              </li>
              <li>
                Buyruqlar oynasida model yuklang: <code>ollama pull &lt;model-nomi&gt;</code> (model ro‘yxati
                ollama.com saytida).
              </li>
              <li>“Ulanishni tekshirish”ni bosing va modelni tanlang.</li>
            </ol>
          </details>

          <div className="row-actions">
            <button
              type="button"
              className="btn btn--secondary"
              disabled={testing === 'ollama'}
              onClick={() => void test('ollama')}
            >
              <PlugZap size={16} aria-hidden="true" />
              {testing === 'ollama' ? 'Tekshirilmoqda…' : 'Ulanishni tekshirish'}
            </button>
          </div>
          <TestResult provider="ollama" />
          <ModelSelect provider="ollama" value={s.ollama.model} />
        </div>
      )}
    </section>
  );
}
