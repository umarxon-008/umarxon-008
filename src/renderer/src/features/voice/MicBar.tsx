import { useEffect, useRef } from 'react';
import { Loader2, Mic, MicOff, Pause, Play, RotateCcw, Send, Square, X } from 'lucide-react';
import { useVoice } from './voiceStore';
import { uz } from '../../i18n/uz';

/** Pastki ovoz paneli: holat mashinasining barcha holatlari shu yerda ko'rinadi. */
export function MicBar() {
  const v = useVoice();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { status } = v;
  const listening = status === 'listening';
  const busy = status === 'transcribing' || status === 'thinking';

  // Sahifadan chiqilganda mikrofon albatta o'chiriladi
  const { stop } = v;
  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    if (status === 'review' && v.target === 'dashboard') inputRef.current?.focus();
  }, [status, v.target]);

  const mainButton = () => {
    if (listening) {
      return (
        <button
          type="button"
          className="micbar__button is-listening"
          onClick={() => void v.stopListening()}
          aria-pressed="true"
          aria-label={uz.voice.stopListening}
          title={uz.voice.stopListening}
        >
          <Square size={22} aria-hidden="true" />
        </button>
      );
    }
    if (status === 'speaking') {
      return (
        <button
          type="button"
          className="micbar__button is-speaking"
          onClick={() => v.cancel()}
          aria-label={uz.voice.stopSpeaking}
          title={uz.voice.stopSpeaking}
        >
          <Square size={22} aria-hidden="true" />
        </button>
      );
    }
    return (
      <button
        type="button"
        className={`micbar__button${status === 'error' ? ' is-error' : ''}`}
        onClick={() => void v.startListening('dashboard')}
        disabled={busy}
        aria-pressed="false"
        aria-label={uz.voice.start}
        title={uz.voice.start}
      >
        {busy ? (
          <Loader2 size={24} className="spin" aria-hidden="true" />
        ) : status === 'error' ? (
          <MicOff size={24} aria-hidden="true" />
        ) : (
          <Mic size={24} aria-hidden="true" />
        )}
      </button>
    );
  };

  const reviewing = status === 'review' && v.target === 'dashboard';

  return (
    <section className={`micbar card${reviewing ? ' is-review' : ''}`} aria-label={uz.voice.micLabel}>
      {mainButton()}

      <div className="micbar__text" role="status" aria-live="polite">
        <span className="micbar__label">
          <Mic size={14} aria-hidden="true" />
          {uz.voice.micLabel}
          {listening && <span className="micbar__live">● yoqiq</span>}
        </span>

        {reviewing ? (
          <>
            <label htmlFor="voice-transcript" className="visually-hidden">
              {uz.voice.review}
            </label>
            <textarea
              id="voice-transcript"
              ref={inputRef}
              className="micbar__transcript"
              rows={2}
              value={v.transcript}
              onChange={(e) => v.setTranscript(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void v.sendTranscript();
                }
              }}
            />
            <small className="micbar__hint">{uz.voice.reviewHint}</small>
          </>
        ) : (
          <>
            <strong
              className={`micbar__state${listening || busy || status === 'speaking' ? ' is-listening' : ''}`}
            >
              {status === 'error'
                ? v.message
                : listening
                  ? `“${uz.voice.listening}”`
                  : status === 'transcribing'
                    ? uz.voice.transcribing
                    : status === 'thinking'
                      ? uz.voice.thinking
                      : status === 'speaking'
                        ? uz.voice.speaking
                        : uz.voice.idleHint}
            </strong>
            <small className="micbar__hint">
              {status !== 'error' && v.message
                ? v.message
                : listening
                  ? uz.voice.hintListening
                  : status === 'speaking'
                    ? uz.voice.hintSpeaking
                    : uz.voice.hintIdle}
            </small>
          </>
        )}
      </div>

      <div className="micbar__actions">
        {reviewing && (
          <>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => void v.sendTranscript()}
              disabled={!v.transcript.trim()}
            >
              <Send size={14} aria-hidden="true" /> {uz.voice.send}
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => void v.startListening('dashboard')}
            >
              <RotateCcw size={14} aria-hidden="true" /> {uz.voice.retry}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => v.cancel()}
              aria-label={uz.voice.cancel}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </>
        )}
        {status === 'speaking' && (
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => (v.paused ? v.resumeSpeaking() : v.pauseSpeaking())}
          >
            {v.paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
            {v.paused ? uz.voice.resume : uz.voice.pause}
          </button>
        )}
        {(status === 'transcribing' || status === 'thinking') && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => v.cancel()}>
            {uz.voice.cancel}
          </button>
        )}
      </div>
    </section>
  );
}
