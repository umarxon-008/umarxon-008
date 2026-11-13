/**
 * Ovoz holat mashinasi (prompt §8.4). Noto'g'ri ketma-ketliklar e'tiborsiz qoldiriladi,
 * shuning uchun bir vaqtda ikki audio jarayon (masalan, tinglash va gapirish) boshlanmaydi.
 *
 * IDLE → LISTENING → TRANSCRIBING → REVIEW (transkriptni tahrirlash) → THINKING → SPEAKING → IDLE
 * Istalgan holatdan: CANCEL → IDLE, FAIL → ERROR.
 * AWAITING_CONFIRMATION va EXECUTING 4-bosqichda (kompyuter amallari) ishlatiladi.
 */
export type VoiceState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'review'
  | 'thinking'
  | 'awaiting_confirmation'
  | 'executing'
  | 'speaking'
  | 'error';

export type VoiceEvent =
  | 'START_LISTENING'
  | 'STOP_LISTENING'
  | 'TRANSCRIBED'
  | 'SEND'
  | 'REPLY_DONE'
  | 'SPEAK'
  | 'SPEECH_END'
  | 'CANCEL'
  | 'FAIL';

const TRANSITIONS: Record<VoiceState, Partial<Record<VoiceEvent, VoiceState>>> = {
  idle: { START_LISTENING: 'listening', SPEAK: 'speaking', FAIL: 'error' },
  listening: { STOP_LISTENING: 'transcribing', CANCEL: 'idle', FAIL: 'error' },
  transcribing: { TRANSCRIBED: 'review', CANCEL: 'idle', FAIL: 'error' },
  review: { SEND: 'thinking', START_LISTENING: 'listening', CANCEL: 'idle', FAIL: 'error' },
  thinking: { REPLY_DONE: 'idle', SPEAK: 'speaking', CANCEL: 'idle', FAIL: 'error' },
  awaiting_confirmation: { CANCEL: 'idle', FAIL: 'error' },
  executing: { CANCEL: 'idle', FAIL: 'error' },
  speaking: { SPEECH_END: 'idle', CANCEL: 'idle', START_LISTENING: 'listening', FAIL: 'error' },
  error: { START_LISTENING: 'listening', SPEAK: 'speaking', CANCEL: 'idle', FAIL: 'error' },
};

/** Ruxsat etilgan o'tish bo'lsa yangi holat, aks holda null */
export function transition(state: VoiceState, event: VoiceEvent): VoiceState | null {
  return TRANSITIONS[state][event] ?? null;
}
