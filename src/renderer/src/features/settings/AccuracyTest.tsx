import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, Loader2, Mic, SkipForward, Square } from 'lucide-react';
import { MicError, MicInput } from '../voice/micInput';
import { recordingToWavBase64 } from '../voice/wav';
import { TEST_SENTENCES, type SentenceCategory } from '../voice/testSentences';
import { aggregateWer, wer } from '../../lib/wer';
import { uz } from '../../i18n/uz';
import { useVoice } from '../voice/voiceStore';

interface Result {
  id: string;
  category: SentenceCategory;
  reference: string;
  hypothesis: string;
  wer: number;
  seconds: number;
}

const pct = (v: number) => `${Math.round(Math.max(0, 1 - v) * 100)}%`;

/**
 * O'zbekcha nutqni tanish aniqligi testi (prompt §8.5).
 * Foydalanuvchi gapni o'qiydi, MARIUS uni matnga aylantiradi va WER bo'yicha aniqlik hisoblanadi.
 * Natijalar faqat shu oynada turadi; hisobotni nusxalash uchun JSON ko'rsatiladi.
 */
export function AccuracyTest() {
  const micRef = useRef(new MicInput());
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<'idle' | 'recording' | 'processing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [showReport, setShowReport] = useState(false);
  const voiceBusy = useVoice((v) => v.status !== 'idle' && v.status !== 'error');
  const sentence = TEST_SENTENCES[index % TEST_SENTENCES.length]!;

  // Bo'limdan chiqilganda mikrofon albatta o'chadi
  useEffect(() => {
    const mic = micRef.current;
    return () => void mic.stop();
  }, []);

  const start = async () => {
    setError(null);
    try {
      await micRef.current.start({ record: true });
      setState('recording');
    } catch (e) {
      setError(uz.voice.errors[e instanceof MicError ? e.kind : 'unknown']);
    }
  };

  const stop = async () => {
    const rec = micRef.current.stop();
    setState('processing');
    const wav = recordingToWavBase64(rec.chunks, rec.sampleRate);
    if (!wav) {
      setError(uz.voice.nothingHeard);
      setState('idle');
      return;
    }
    const r = await window.marius.voice.transcribe(wav.base64);
    setState('idle');
    if (!r.ok) {
      setError(r.error.message);
      return;
    }
    setResults((prev) => [
      ...prev,
      {
        id: sentence.id,
        category: sentence.category,
        reference: sentence.text,
        hypothesis: r.data.text,
        wer: wer(sentence.text, r.data.text),
        seconds: Math.round(wav.seconds * 10) / 10,
      },
    ]);
    setIndex((i) => i + 1);
  };

  const byCategory = useMemo(() => {
    const map = new Map<SentenceCategory, Result[]>();
    for (const r of results) map.set(r.category, [...(map.get(r.category) ?? []), r]);
    return [...map.entries()].map(([category, rs]) => ({
      category,
      count: rs.length,
      wer: aggregateWer(rs),
    }));
  }, [results]);

  const overall = results.length ? aggregateWer(results) : null;
  const report = JSON.stringify(
    {
      date: new Date().toISOString(),
      provider: 'gemini',
      sentences: results.length,
      overallAccuracy: overall === null ? null : pct(overall),
      byCategory: byCategory.map((c) => ({ ...c, accuracy: pct(c.wer) })),
      results,
    },
    null,
    2,
  );

  return (
    <div className="accuracy">
      <h3 className="settings-subtitle">
        <ClipboardList size={16} aria-hidden="true" /> O‘zbekcha nutqni tanish aniqligi testi
      </h3>
      <p className="small muted">
        Gapni oddiy ovozda o‘qing. MARIUS uni matnga aylantiradi va so‘zma-so‘z solishtiradi (WER).{' '}
        {TEST_SENTENCES.length} ta gap, 6 toifa. Natija faqat shu oynada ko‘rinadi.
      </p>

      <div className="accuracy__card">
        <small className="muted">
          {(index % TEST_SENTENCES.length) + 1}/{TEST_SENTENCES.length} · {sentence.category}
        </small>
        <p className="accuracy__sentence">“{sentence.text}”</p>
        <div className="row-actions">
          {state === 'recording' ? (
            <button type="button" className="btn btn--primary" onClick={() => void stop()}>
              <Square size={16} aria-hidden="true" /> Tugatish
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              disabled={state === 'processing' || voiceBusy}
              onClick={() => void start()}
            >
              {state === 'processing' ? (
                <Loader2 size={16} className="spin" aria-hidden="true" />
              ) : (
                <Mic size={16} aria-hidden="true" />
              )}
              {state === 'processing' ? 'Aylantirilmoqda…' : 'O‘qib berish'}
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost"
            disabled={state !== 'idle'}
            onClick={() => setIndex((i) => i + 1)}
          >
            <SkipForward size={16} aria-hidden="true" /> O‘tkazib yuborish
          </button>
        </div>
        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}
      </div>

      {results.length > 0 && (
        <>
          <p className="accuracy__total" role="status">
            Umumiy aniqlik: <strong>{overall === null ? '—' : pct(overall)}</strong> ({results.length} ta gap)
          </p>
          <table className="accuracy__table">
            <thead>
              <tr>
                <th>Toifa</th>
                <th>Gaplar</th>
                <th>Aniqlik</th>
              </tr>
            </thead>
            <tbody>
              {byCategory.map((c) => (
                <tr key={c.category}>
                  <td>{c.category}</td>
                  <td>{c.count}</td>
                  <td>{pct(c.wer)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <details>
            <summary className="small">Har bir gap natijasi</summary>
            <ul className="accuracy__list">
              {results.map((r, i) => (
                <li key={`${r.id}-${i}`}>
                  <span className="muted">{r.reference}</span>
                  <br />→ {r.hypothesis || <em>(bo‘sh)</em>} <strong>{pct(r.wer)}</strong>
                </li>
              ))}
            </ul>
          </details>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowReport((v) => !v)}>
            {showReport ? 'Hisobotni yashirish' : 'Hisobotni ko‘rsatish (JSON)'}
          </button>
          {showReport && (
            <textarea
              className="accuracy__report"
              readOnly
              value={report}
              rows={8}
              aria-label="Hisobot (JSON)"
            />
          )}
        </>
      )}
    </div>
  );
}
