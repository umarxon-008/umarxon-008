import { useEffect } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { useVoice } from './voiceStore';
import { uz } from '../../i18n/uz';

/** Pastki mikrofon paneli: mikrofonni yoqish/o'chirish va holat matni. */
export function MicBar() {
  const { status, message, toggle, stop } = useVoice();
  const listening = status === 'listening';
  const isError = status === 'error';

  // Sahifadan chiqilganda mikrofon albatta o'chiriladi.
  useEffect(() => () => stop(), [stop]);

  return (
    <section className="micbar card" aria-label={uz.voice.micLabel}>
      <button
        type="button"
        className={`micbar__button${listening ? ' is-listening' : ''}${isError ? ' is-error' : ''}`}
        onClick={() => void toggle()}
        disabled={status === 'starting'}
        aria-pressed={listening}
        aria-label={listening ? uz.voice.stop : uz.voice.start}
        title={listening ? uz.voice.stop : uz.voice.start}
      >
        {listening ? (
          <Square size={22} aria-hidden="true" />
        ) : isError ? (
          <MicOff size={24} aria-hidden="true" />
        ) : (
          <Mic size={24} aria-hidden="true" />
        )}
      </button>

      <div className="micbar__text" role="status" aria-live="polite">
        <span className="micbar__label">
          <Mic size={14} aria-hidden="true" />
          {uz.voice.micLabel}
          {listening && <span className="micbar__live">● yoqiq</span>}
        </span>
        <strong className={`micbar__state${listening ? ' is-listening' : ''}`}>
          {isError ? message : listening ? `“${uz.voice.listening}”` : uz.voice.idleHint}
        </strong>
        <small className="micbar__hint">{!isError && message ? message : uz.voice.sttLater}</small>
      </div>
    </section>
  );
}
