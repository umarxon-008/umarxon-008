import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { MessageCircle, Send } from 'lucide-react';
import type { ChatMessage } from '@shared/ipc';
import { LogoMark } from '../../components/Logo';
import { isAiReady, useAi } from '../../store/ai';
import { useChat } from '../../store/chat';
import { greetingFor } from '../../lib/greeting';
import { plainPreview as preview } from '../../lib/markdown';
import { uz } from '../../i18n/uz';

/** Bosh sahifadagi ixcham suhbat: oxirgi xabarlar va tezkor buyruq maydoni. */
export function RecentConversation() {
  const navigate = useNavigate();
  const ai = useAi();
  const { conversations, loadList, send, startNew } = useChat();
  const [recent, setRecent] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const ready = isAiReady(ai.settings);
  const { load: loadAi } = ai;

  useEffect(() => {
    void loadAi();
    void loadList();
  }, [loadAi, loadList]);

  const latestId = conversations[0]?.id;
  useEffect(() => {
    if (!latestId) return;
    let alive = true;
    void window.marius.chat.getConversation(latestId).then((r) => {
      if (alive && r.ok) setRecent(r.data.messages.slice(-2));
    });
    return () => {
      alive = false;
    };
  }, [latestId, conversations]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    startNew();
    if (await send(value)) {
      setText('');
      void navigate('/chat');
    }
  };

  const shown = latestId ? recent : [];

  return (
    <section className="card conversation" aria-label="So‘nggi suhbat">
      <ul className="conversation__list">
        {shown.length === 0 ? (
          <li className="message">
            <span className="message__avatar message__avatar--marius" aria-hidden="true">
              <LogoMark size={16} />
            </span>
            <div>
              <strong className="message__author">{uz.brand}</strong>
              <p>
                {greetingFor(new Date().getHours())}! {uz.status.ready}
              </p>
            </div>
          </li>
        ) : (
          shown.map((m) => (
            <li key={m.id} className="message">
              <span
                className={`message__avatar${m.role === 'assistant' ? ' message__avatar--marius' : ''}`}
                aria-hidden="true"
              >
                {m.role === 'assistant' ? <LogoMark size={16} /> : <span className="message__you">Siz</span>}
              </span>
              <div>
                {m.role === 'assistant' && <strong className="message__author">{uz.brand}</strong>}
                <p>{m.content ? preview(m.content) : m.status === 'streaming' ? 'Yozmoqda…' : '—'}</p>
              </div>
            </li>
          ))
        )}
      </ul>
      {ready ? (
        <form className="quick-command" onSubmit={(e) => void submit(e)}>
          <MessageCircle size={14} aria-hidden="true" />
          <label htmlFor="quick-command" className="visually-hidden">
            Tezkor buyruq
          </label>
          <input
            id="quick-command"
            className="quick-command__input"
            placeholder="MARIUS’ga yozing…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="submit"
            className="icon-btn icon-btn--sm"
            aria-label="Yuborish"
            disabled={!text.trim()}
          >
            <Send size={14} aria-hidden="true" />
          </button>
        </form>
      ) : (
        <p className="conversation__hint">
          <MessageCircle size={14} aria-hidden="true" />
          {uz.status.notConfigured}. <Link to="/settings">AI’ni sozlash</Link>
        </p>
      )}
    </section>
  );
}
