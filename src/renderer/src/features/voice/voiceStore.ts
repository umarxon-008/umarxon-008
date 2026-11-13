import { create } from 'zustand';
import { uz } from '../../i18n/uz';
import { MicError, MicInput } from './micInput';

/**
 * Ovoz holati. Hozircha IDLE va LISTENING ishlaydi.
 * TRANSCRIBING, THINKING, SPEAKING va boshqalar 3-bosqichda (STT/TTS) qo'shiladi.
 */
export type VoiceStatus = 'idle' | 'starting' | 'listening' | 'error';

const AUTO_STOP_MS = 30_000;

export const mic = new MicInput();
let autoStopTimer: ReturnType<typeof setTimeout> | null = null;

interface VoiceState {
  status: VoiceStatus;
  message: string | null;
  start(): Promise<void>;
  stop(reason?: 'user' | 'auto'): void;
  toggle(): Promise<void>;
}

export const useVoice = create<VoiceState>((set, get) => ({
  status: 'idle',
  message: null,

  async start() {
    const { status } = get();
    if (status === 'starting' || status === 'listening') return; // bir vaqtda faqat bitta audio jarayon
    set({ status: 'starting', message: null });
    try {
      await mic.start();
      set({ status: 'listening', message: null });
      autoStopTimer = setTimeout(() => get().stop('auto'), AUTO_STOP_MS);
    } catch (error) {
      mic.stop();
      const kind = error instanceof MicError ? error.kind : 'unknown';
      set({ status: 'error', message: uz.voice.errors[kind] });
    }
  },

  stop(reason = 'user') {
    if (autoStopTimer) clearTimeout(autoStopTimer);
    autoStopTimer = null;
    mic.stop();
    set({ status: 'idle', message: reason === 'auto' ? uz.voice.autoStopped : null });
  },

  async toggle() {
    if (get().status === 'listening') get().stop();
    else await get().start();
  },
}));
