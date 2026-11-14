import { useState } from 'react';
import { Music, Pause, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from 'lucide-react';
import type { ActionResult, MediaAction } from '@shared/ipc';

const BUTTONS: { action: MediaAction; label: string; icon: React.ReactNode; steps: number }[] = [
  {
    action: 'volume_down',
    label: 'Ovozni pasaytirish',
    icon: <Volume1 size={16} aria-hidden="true" />,
    steps: 5,
  },
  {
    action: 'volume_up',
    label: 'Ovozni balandlatish',
    icon: <Volume2 size={16} aria-hidden="true" />,
    steps: 5,
  },
  {
    action: 'mute',
    label: 'Ovozni o‘chirish/yoqish',
    icon: <VolumeX size={16} aria-hidden="true" />,
    steps: 1,
  },
  {
    action: 'previous_track',
    label: 'Oldingi trek',
    icon: <SkipBack size={16} aria-hidden="true" />,
    steps: 1,
  },
  { action: 'play_pause', label: 'Ijro / pauza', icon: <Pause size={16} aria-hidden="true" />, steps: 1 },
  {
    action: 'next_track',
    label: 'Keyingi trek',
    icon: <SkipForward size={16} aria-hidden="true" />,
    steps: 1,
  },
];

/** Kompyuter → Ovoz va media (PHASE 9): faqat allowlist'dagi media tugmalari. */
export function MediaSection({ onResult }: { onResult: (r: ActionResult) => void }) {
  const [busy, setBusy] = useState(false);
  const press = async (action: MediaAction, steps: number) => {
    setBusy(true);
    const r = await window.marius.computer.media(action, steps);
    setBusy(false);
    onResult(r.ok ? r.data : { ok: false, verified: null, message: r.error.message });
  };
  return (
    <section className="card settings-section" aria-labelledby="media-title">
      <h2 id="media-title">
        <Music size={18} aria-hidden="true" /> Ovoz va media
      </h2>
      <div className="media-buttons" role="group" aria-label="Media tugmalari">
        {BUTTONS.map((b) => (
          <button
            key={b.action}
            type="button"
            className="icon-btn"
            disabled={busy}
            aria-label={b.label}
            title={b.label}
            onClick={() => void press(b.action, b.steps)}
          >
            {b.icon}
          </button>
        ))}
      </div>
      <p className="small muted">
        Ovoz bir bosishda taxminan 10% o‘zgaradi. Chatda ham so‘rashingiz mumkin: “ovozni pasaytir”, “keyingi
        qo‘shiq”.
      </p>
    </section>
  );
}
