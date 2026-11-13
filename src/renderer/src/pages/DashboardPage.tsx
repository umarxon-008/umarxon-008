import { Bell, Cpu, Mic, Send, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '../components/StateViews';
import { uz } from '../i18n/uz';
import { greetingFor } from '../lib/greeting';

export function DashboardPage() {
  const greeting = greetingFor(new Date().getHours());

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="hero__eyebrow">{uz.brand}</p>
          <h1 className="hero__title">{greeting}!</h1>
          <p className="hero__subtitle">Bugun sizga qanday yordam bera olaman?</p>
        </div>
        <div className="status-pill" role="status">
          <span className="status-pill__dot" aria-hidden="true" />
          <span>{uz.status.idle}</span>
        </div>
      </section>

      <section className="card command" aria-labelledby="command-title">
        <h2 id="command-title" className="visually-hidden">
          Tezkor buyruq
        </h2>
        <div className="command__row">
          <Sparkles size={18} aria-hidden="true" className="command__icon" />
          <input
            className="command__input"
            placeholder="Masalan: “Kalkulyatorni och” yoki “Bugun 19:00 da eslat”"
            disabled
            aria-describedby="command-hint"
          />
          <button type="button" className="icon-btn" disabled aria-label="Ovozli buyruq (3-bosqichda)">
            <Mic size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--primary"
            disabled
            aria-label="Yuborish (2-bosqichda)"
          >
            <Send size={18} aria-hidden="true" />
          </button>
        </div>
        <p id="command-hint" className="hint">
          {uz.status.notConfigured}. Matnli suhbat 2-bosqichda, ovozli buyruq 3-bosqichda yoqiladi.
        </p>
      </section>

      <div className="grid">
        <section className="card" aria-labelledby="reminders-title">
          <header className="card__header">
            <Bell size={18} aria-hidden="true" />
            <h2 id="reminders-title">Bugungi eslatmalar</h2>
          </header>
          <EmptyState title="Eslatmalar yo‘q">Eslatmalar 7-bosqichda qo‘shiladi.</EmptyState>
        </section>

        <section className="card" aria-labelledby="system-title">
          <header className="card__header">
            <Cpu size={18} aria-hidden="true" />
            <h2 id="system-title">Tizim holati</h2>
          </header>
          <EmptyState title="Monitoring hali yoqilmagan">
            CPU, RAM va disk ko‘rsatkichlari 8-bosqichda qo‘shiladi.
          </EmptyState>
        </section>
      </div>

      <p className="footnote">
        Sozlash uchun <Link to="/settings">Sozlamalar</Link> bo‘limiga o‘ting.
      </p>
    </div>
  );
}
