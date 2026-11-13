import { MessageCircle } from 'lucide-react';
import { LogoMark } from '../components/Logo';
import { MicBar } from '../features/voice/MicBar';
import { VoiceOrb } from '../features/voice/VoiceOrb';
import { useVoice } from '../features/voice/voiceStore';
import { SystemStatusPanel } from '../features/monitoring/SystemStatusPanel';
import { greetingFor } from '../lib/greeting';
import { uz } from '../i18n/uz';

export function DashboardPage() {
  const listening = useVoice((s) => s.status === 'listening');
  const greeting = greetingFor(new Date().getHours());

  return (
    <div className="dashboard">
      <section className="card orb-panel" aria-label="MARIUS holati">
        <VoiceOrb />
        <div className="orb-panel__caption">
          <strong>{uz.brand}</strong>
          <span>{listening ? uz.status.listening : uz.status.ready}</span>
        </div>
      </section>

      <SystemStatusPanel />

      <section className="card conversation" aria-label="So‘nggi suhbat">
        <ul className="conversation__list">
          <li className="message">
            <span className="message__avatar message__avatar--marius" aria-hidden="true">
              <LogoMark size={16} />
            </span>
            <div>
              <strong className="message__author">{uz.brand}</strong>
              <p>
                {greeting}! {uz.status.ready}
              </p>
            </div>
          </li>
        </ul>
        <p className="conversation__hint">
          <MessageCircle size={14} aria-hidden="true" />
          {uz.status.notConfigured}. Matnli suhbat 2-bosqichda qo‘shiladi.
        </p>
      </section>

      <MicBar />
    </div>
  );
}
