import { create } from 'zustand';
import { uz } from '../../i18n/uz';
import { useChat } from '../../store/chat';
import { useSettings } from '../../store/settings';
import { transition, type VoiceEvent, type VoiceState } from './machine';
import { MicError, MicInput } from './micInput';
import { Speaker } from './speaker';
import { recordingToWavBase64 } from './wav';

/** Eski komponentlar bilan moslik uchun: holat nomi */
export type VoiceStatus = VoiceState;

const AUTO_STOP_MS = 30_000;

export const mic = new MicInput();
export const speaker = new Speaker();
let autoStopTimer: ReturnType<typeof setTimeout> | null = null;
let pendingRequestId: string | null = null;

/** Transkript qayerga ketadi: bosh sahifa (darhol suhbatga) yoki chat sahifasi (yozish maydoniga) */
export type VoiceTarget = 'dashboard' | 'chat';

interface VoiceStore {
  status: VoiceState;
  message: string | null;
  transcript: string;
  target: VoiceTarget;
  paused: boolean;
  /** Qaysi xabar o'qilmoqda (chat sahifasidagi tugmalar uchun) */
  speakingMessageId: string | null;
  startListening(target?: VoiceTarget): Promise<void>;
  stopListening(): Promise<void>;
  toggle(target?: VoiceTarget): Promise<void>;
  setTranscript(text: string): void;
  sendTranscript(): Promise<void>;
  /** Transkriptni olib, holatni tozalaydi (chat sahifasi uchun) */
  takeTranscript(): string;
  speak(text: string, messageId?: string | null): Promise<void>;
  pauseSpeaking(): void;
  resumeSpeaking(): void;
  cancel(): void;
  /** Eski nom: mikrofonni o'chirish */
  stop(): void;
}

function speakOptions() {
  const s = useSettings.getState().settings;
  return {
    engine: s?.ttsEngine === 'gemini' ? ('gemini' as const) : ('system' as const),
    voiceName: s?.ttsSystemVoice ?? null,
    rate: s?.ttsRate ?? 1,
  };
}

async function synthesize(text: string) {
  const r = await window.marius.voice.synthesize(text.slice(0, 4000));
  if (!r.ok) throw new Error(r.error.message);
  return r.data;
}

export const useVoice = create<VoiceStore>((set, get) => {
  /** Faqat ruxsat etilgan o'tishlar bajariladi (state machine) */
  const go = (event: VoiceEvent, patch: Partial<VoiceStore> = {}): boolean => {
    const next = transition(get().status, event);
    if (!next) return false;
    set({ status: next, ...patch });
    return true;
  };

  const clearTimer = () => {
    if (autoStopTimer) clearTimeout(autoStopTimer);
    autoStopTimer = null;
  };

  return {
    status: 'idle',
    message: null,
    transcript: '',
    target: 'dashboard',
    paused: false,
    speakingMessageId: null,

    async startListening(target = 'dashboard') {
      const prev = get().status;
      if (!transition(prev, 'START_LISTENING')) return; // bir vaqtda faqat bitta audio jarayon
      if (prev === 'speaking') speaker.stop();
      const settings = useSettings.getState().settings;
      // STT o'chiq yoki rozilik yo'q bo'lsa ham mikrofon shar uchun ishlaydi, lekin yozilmaydi
      const record = settings?.sttProvider === 'gemini' && settings.sttCloudConsent;
      set({ status: 'listening', target, message: null, transcript: '', speakingMessageId: null });
      try {
        await mic.start({ record });
        clearTimer();
        autoStopTimer = setTimeout(() => void get().stopListening(), AUTO_STOP_MS);
      } catch (error) {
        mic.stop();
        const kind = error instanceof MicError ? error.kind : 'unknown';
        set({ status: 'error', message: uz.voice.errors[kind] });
      }
    },

    async stopListening() {
      clearTimer();
      if (!go('STOP_LISTENING')) return;
      const recording = mic.stop();
      const settings = useSettings.getState().settings;

      if (settings?.sttProvider !== 'gemini') {
        go('CANCEL', { message: uz.voice.sttOff });
        return;
      }
      if (!settings.sttCloudConsent) {
        go('CANCEL', { message: uz.voice.consentNeeded });
        return;
      }
      const wav = recordingToWavBase64(recording.chunks, recording.sampleRate);
      if (!wav) {
        go('CANCEL', { message: uz.voice.nothingHeard });
        return;
      }
      const r = await window.marius.voice.transcribe(wav.base64);
      if (get().status !== 'transcribing') return; // foydalanuvchi bekor qildi
      if (!r.ok) {
        go('FAIL', { message: r.error.message });
        return;
      }
      if (!r.data.text) {
        go('CANCEL', { message: uz.voice.notRecognized });
        return;
      }
      go('TRANSCRIBED', { transcript: r.data.text, message: null });
    },

    async toggle(target = 'dashboard') {
      if (get().status === 'listening') await get().stopListening();
      else await get().startListening(target);
    },

    setTranscript(text) {
      set({ transcript: text });
    },

    takeTranscript() {
      const t = get().transcript;
      go('CANCEL', { transcript: '' });
      return t;
    },

    async sendTranscript() {
      const text = get().transcript.trim();
      if (!text || !go('SEND', { message: null })) return;
      const chat = useChat.getState();
      const ok = await chat.send(text);
      if (!ok) {
        go('FAIL', { message: useChat.getState().error ?? uz.errors.unexpected });
        return;
      }
      pendingRequestId = useChat.getState().streaming?.requestId ?? null;
      if (!pendingRequestId) go('REPLY_DONE'); // javob allaqachon tugagan
    },

    async speak(text, messageId = null) {
      const settings = useSettings.getState().settings;
      if (!settings || settings.ttsEngine === 'off') {
        set({ message: uz.voice.ttsOff });
        return;
      }
      if (!go('SPEAK', { message: null, speakingMessageId: messageId, paused: false })) return;
      try {
        await speaker.speak(text, speakOptions(), synthesize);
        go('SPEECH_END', { speakingMessageId: null, paused: false });
      } catch (error) {
        go('FAIL', {
          message: error instanceof Error && error.message ? error.message : uz.voice.ttsFailed,
          speakingMessageId: null,
        });
      }
    },

    pauseSpeaking() {
      speaker.pause();
      set({ paused: speaker.paused });
    },

    resumeSpeaking() {
      speaker.resume();
      set({ paused: speaker.paused });
    },

    cancel() {
      clearTimer();
      pendingRequestId = null;
      mic.stop();
      speaker.stop();
      set({ status: 'idle', transcript: '', paused: false, speakingMessageId: null });
    },

    stop() {
      if (get().status === 'listening') {
        clearTimer();
        mic.stop();
        set({ status: 'idle' });
      }
    },
  };
});

// Ovozli savolga javob tugaganda: sozlama yoqilgan bo'lsa ovoz chiqarib o'qiladi.
window.marius.chat.onEvent((e) => {
  if (e.type === 'delta' || e.requestId !== pendingRequestId) return;
  pendingRequestId = null;
  const voice = useVoice.getState();
  if (voice.status !== 'thinking') return;
  if (e.type === 'error') {
    useVoice.setState({ status: 'error', message: e.message });
    return;
  }
  const settings = useSettings.getState().settings;
  const message = useChat.getState().messages.find((m) => m.id === e.messageId);
  if (
    e.status === 'complete' &&
    settings?.speakVoiceReplies &&
    settings.ttsEngine !== 'off' &&
    message?.content
  ) {
    void voice.speak(message.content, message.id);
  } else {
    useVoice.setState({ status: 'idle' });
  }
});
