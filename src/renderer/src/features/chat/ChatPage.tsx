import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import {
  AlertTriangle,
  Cloud,
  HardDrive,
  Loader2,
  Mic,
  Pause,
  Play,
  Volume2,
  VolumeX,
  MessageSquarePlus,
  RotateCcw,
  Send,
  Settings as SettingsIcon,
  Square,
  Trash2,
} from 'lucide-react';
import { MAX_MESSAGE_LENGTH, type ChatMessage } from '@shared/ipc';
import { LogoMark } from '../../components/Logo';
import { Markdown } from '../../components/Markdown';
import { isAiReady, useAi } from '../../store/ai';
import { useChat } from '../../store/chat';
import { useVoice } from '../voice/voiceStore';
import { ToolActivityCard } from '../tools/ToolActivityCard';
import type { ToolActivity } from '@shared/ipc';
import { uz } from '../../i18n/uz';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' });
}

function ReadAloud({ message }: { message: ChatMessage }) {
  const voice = useVoice();
  const active = voice.speakingMessageId === message.id && voice.status === 'speaking';
  if (active) {
    return (
      <span className="chat-msg__tools">
        <button
          type="button"
          className="link-btn"
          onClick={() => (voice.paused ? voice.resumeSpeaking() : voice.pauseSpeaking())}
        >
          {voice.paused ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}
          {voice.paused ? uz.voice.resume : uz.voice.pause}
        </button>
        <button type="button" className="link-btn" onClick={() => voice.cancel()}>
          <VolumeX size={12} aria-hidden="true" /> {uz.voice.stopSpeaking}
        </button>
      </span>
    );
  }
  return (
    <span className="chat-msg__tools">
      <button
        type="button"
        className="link-btn"
        disabled={voice.status === 'listening' || voice.status === 'transcribing'}
        onClick={() => void voice.speak(message.content, message.id)}
      >
        <Volume2 size={12} aria-hidden="true" /> {uz.voice.readAloud}
      </button>
    </span>
  );
}

function MessageView({ m, activities }: { m: ChatMessage; activities: ToolActivity[] }) {
  if (m.role === 'user') {
    return (
      <li className="chat-msg chat-msg--user">
        <div className="chat-msg__bubble">{m.content}</div>
      </li>
    );
  }
  return (
    <li className="chat-msg chat-msg--assistant" aria-busy={m.status === 'streaming'}>
      <span className="message__avatar message__avatar--marius" aria-hidden="true">
        <LogoMark size={16} />
      </span>
      <div className="chat-msg__body">
        <strong className="message__author">MARIUS</strong>
        {activities.length > 0 && (
          <div className="tool-cards">
            {activities.map((a) => (
              <ToolActivityCard key={a.id} activity={a} />
            ))}
          </div>
        )}
        {m.content ? (
          <Markdown text={m.content} />
        ) : m.status === 'streaming' ? (
          <p className="chat-msg__typing" aria-label="Javob yozilmoqda">
            <span />
            <span />
            <span />
          </p>
        ) : null}
        {m.status === 'streaming' && m.content && <span className="chat-msg__cursor" aria-hidden="true" />}
        {m.status === 'complete' && m.content && <ReadAloud message={m} />}
        {m.status === 'cancelled' && <small className="chat-msg__meta">⏹ To‘xtatildi</small>}
        {m.status === 'error' && (
          <small className="chat-msg__meta chat-msg__meta--error">
            ⚠ Javob to‘liq olinmadi{m.errorCode === 'INTERRUPTED' ? ' (ilova yopilib qolgan)' : ''}
          </small>
        )}
      </div>
    </li>
  );
}

export function ChatPage() {
  const ai = useAi();
  const chat = useChat();
  const [text, setText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const ready = isAiReady(ai.settings);
  const busy = Boolean(chat.streaming) || chat.sending;

  const { load: loadAi } = ai;
  const { loadList } = chat;
  useEffect(() => {
    void loadAi();
    void loadList();
  }, [loadAi, loadList]);

  // Ovozli kiritish: transkript yozish maydoniga qo'yiladi (yuborishdan oldin tahrirlash mumkin)
  const voiceStatus = useVoice((v) => v.status);
  const voiceTarget = useVoice((v) => v.target);
  const voiceMessage = useVoice((v) => v.message);
  useEffect(
    () =>
      useVoice.subscribe((v) => {
        if (v.status === 'review' && v.target === 'chat') {
          const t = useVoice.getState().takeTranscript();
          setText((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t));
          inputRef.current?.focus();
        }
      }),
    [],
  );
  const dictating = voiceTarget === 'chat' && (voiceStatus === 'listening' || voiceStatus === 'transcribing');

  // Yangi matn kelganda pastga aylantirish
  const lastContent = chat.messages.at(-1)?.content.length ?? 0;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages.length, lastContent]);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    if (await chat.send(value)) setText('');
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  };

  const s = ai.settings;
  const providerBadge =
    s?.provider === 'gemini' ? (
      <span className="badge badge--cloud" title="Xabarlar Google serverlariga yuboriladi">
        <Cloud size={12} aria-hidden="true" /> Gemini · {s.gemini.model ?? '—'} · internet
      </span>
    ) : s?.provider === 'ollama' ? (
      <span
        className="badge badge--local"
        title={s.ollama.isLocal ? 'Ma’lumot kompyuterdan chiqmaydi' : 'Tarmoqdagi Ollama server'}
      >
        <HardDrive size={12} aria-hidden="true" /> Ollama · {s.ollama.model ?? '—'} ·{' '}
        {s.ollama.isLocal ? 'lokal' : 'tarmoq'}
      </span>
    ) : null;

  const active = chat.conversations.find((c) => c.id === chat.activeId);

  return (
    <div className="chat">
      <aside className="card chat__sidebar" aria-label="Suhbatlar">
        <button type="button" className="btn btn--primary btn--block" onClick={() => chat.startNew()}>
          <MessageSquarePlus size={16} aria-hidden="true" />
          Yangi suhbat
        </button>
        {chat.conversations.length === 0 ? (
          <p className="chat__empty-list">Hali suhbatlar yo‘q.</p>
        ) : (
          <ul className="conv-list">
            {chat.conversations.map((c) => (
              <li key={c.id} className={`conv-item${c.id === chat.activeId ? ' is-active' : ''}`}>
                <button
                  type="button"
                  className="conv-item__open"
                  onClick={() => void chat.open(c.id)}
                  title={c.title}
                >
                  <span className="conv-item__title">{c.title}</span>
                  <small>
                    {formatTime(c.updatedAt)}
                    {!c.persisted && ' · saqlanmaydi'}
                  </small>
                </button>
                {confirmDelete === c.id ? (
                  <span className="conv-item__confirm">
                    <button
                      type="button"
                      className="link-btn link-btn--danger"
                      onClick={() => void chat.remove(c.id).then(() => setConfirmDelete(null))}
                    >
                      O‘chirish
                    </button>
                    <button type="button" className="link-btn" onClick={() => setConfirmDelete(null)}>
                      Yo‘q
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm conv-item__delete"
                    onClick={() => setConfirmDelete(c.id)}
                    aria-label={`“${c.title}” suhbatini o‘chirish`}
                    title="O‘chirish"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="card chat__main" aria-label="Suhbat">
        <header className="chat__header">
          <h1>{active?.title ?? 'Yangi suhbat'}</h1>
          {providerBadge}
        </header>

        <div className="chat__messages" ref={listRef}>
          {!ready && ai.settings ? (
            <div className="chat__setup">
              <SettingsIcon size={28} aria-hidden="true" />
              <strong>AI hali ulanmagan</strong>
              <p>
                Suhbatlashish uchun bepul AI’ni ulang: <b>Google Gemini</b> (internet orqali, bepul kalit
                bilan) yoki <b>Ollama</b> (kompyuterning o‘zida, internetsiz).
              </p>
              <Link to="/settings" className="btn btn--primary">
                AI’ni sozlash
              </Link>
            </div>
          ) : chat.messages.length === 0 ? (
            <div className="chat__setup">
              <LogoMark size={36} />
              <strong>Salom! Men MARIUS.</strong>
              <p>Savolingizni yozing. Masalan: “Menga C++ sikllarini tushuntirib ber.”</p>
            </div>
          ) : (
            <ul className="chat__list" role="log" aria-live="polite" aria-label="Xabarlar">
              {chat.messages.map((m) => (
                <MessageView
                  key={m.id}
                  m={m}
                  activities={chat.activities.filter((a) => a.messageId === m.id)}
                />
              ))}
            </ul>
          )}
        </div>

        {chat.failure && (
          <div className="alert alert--error chat__alert" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{chat.failure.message}</span>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => void chat.regenerate()}
            >
              <RotateCcw size={14} aria-hidden="true" />
              Qayta urinish
            </button>
          </div>
        )}
        {chat.error && (
          <div className="alert alert--error chat__alert" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{chat.error}</span>
          </div>
        )}

        <form className="composer" onSubmit={(e) => void submit(e)}>
          <label htmlFor="chat-input" className="visually-hidden">
            Xabar
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            className="composer__input"
            rows={2}
            placeholder={
              ready
                ? 'MARIUS’ga yozing… (Enter — yuborish, Shift+Enter — yangi qator)'
                : 'Avval AI’ni sozlang'
            }
            value={text}
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={!ready}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            type="button"
            className={`icon-btn${dictating ? ' icon-btn--live' : ''}`}
            disabled={!ready || voiceStatus === 'transcribing' || chat.sending}
            onClick={() =>
              voiceStatus === 'listening'
                ? void useVoice.getState().stopListening()
                : void useVoice.getState().startListening('chat')
            }
            aria-label={
              voiceStatus === 'listening' && voiceTarget === 'chat'
                ? uz.voice.stopListening
                : 'Ovoz bilan yozish'
            }
            title={
              voiceStatus === 'listening' && voiceTarget === 'chat'
                ? uz.voice.stopListening
                : 'Ovoz bilan yozish'
            }
          >
            {voiceStatus === 'transcribing' && voiceTarget === 'chat' ? (
              <Loader2 size={18} className="spin" aria-hidden="true" />
            ) : voiceStatus === 'listening' && voiceTarget === 'chat' ? (
              <Square size={16} aria-hidden="true" />
            ) : (
              <Mic size={18} aria-hidden="true" />
            )}
          </button>
          {chat.streaming ? (
            <button
              type="button"
              className="icon-btn icon-btn--stop"
              onClick={() => void chat.cancel()}
              aria-label="Javobni to‘xtatish"
              title="To‘xtatish"
            >
              <Square size={18} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              className="icon-btn icon-btn--primary"
              disabled={!ready || !text.trim() || chat.sending}
              aria-label="Yuborish"
              title="Yuborish"
            >
              <Send size={18} aria-hidden="true" />
            </button>
          )}
        </form>
        {voiceTarget === 'chat' && voiceMessage && (voiceStatus === 'idle' || voiceStatus === 'error') && (
          <p className="composer__note composer__note--warn" role="status">
            {voiceMessage}
          </p>
        )}
        {dictating && (
          <p className="composer__note" role="status">
            {voiceStatus === 'listening' ? `🎙 ${uz.voice.hintListening}` : uz.voice.transcribing}
          </p>
        )}
        {s?.provider === 'gemini' && (
          <p className="composer__note">
            <Cloud size={12} aria-hidden="true" /> Gemini ishlatilmoqda: xabarlaringiz javob olish uchun
            Google serverlariga yuboriladi.
          </p>
        )}
      </section>
    </div>
  );
}
