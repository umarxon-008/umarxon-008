import { MicBar } from '../features/voice/MicBar';
import { VoiceOrb } from '../features/voice/VoiceOrb';
import { useVoice } from '../features/voice/voiceStore';
import { SystemStatusPanel } from '../features/monitoring/SystemStatusPanel';
import { RecentConversation } from '../features/chat/RecentConversation';
import { uz } from '../i18n/uz';

export function DashboardPage() {
  const listening = useVoice((s) => s.status === 'listening');

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

      <RecentConversation />

      <MicBar />
    </div>
  );
}
