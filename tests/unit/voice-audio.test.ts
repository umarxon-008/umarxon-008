import { describe, expect, it } from 'vitest';
import {
  base64ToBytes,
  bytesToBase64,
  downsample,
  encodeWav,
  floatTo16BitPcm,
  parsePcmRate,
  pcm16ToFloat32,
  recordingToWavBase64,
} from '../../src/renderer/src/features/voice/wav';
import { transition, type VoiceEvent, type VoiceState } from '../../src/renderer/src/features/voice/machine';

describe('WAV kodlash', () => {
  it('to‘g‘ri RIFF/WAVE sarlavha (16 kHz, mono, 16-bit)', () => {
    const wav = encodeWav(new Int16Array([0, 1000, -1000]), 16000);
    const v = new DataView(wav.buffer);
    const str = (o: number, n: number) => String.fromCharCode(...wav.slice(o, o + n));
    expect(str(0, 4)).toBe('RIFF');
    expect(str(8, 4)).toBe('WAVE');
    expect(v.getUint16(22, true)).toBe(1);
    expect(v.getUint32(24, true)).toBe(16000);
    expect(v.getUint16(34, true)).toBe(16);
    expect(v.getUint32(40, true)).toBe(6);
    expect(v.getInt16(46, true)).toBe(1000);
    expect(wav.length).toBe(50);
  });

  it('48 kHz → 16 kHz: uzunlik 3 marta qisqaradi', () => {
    expect(downsample(new Float32Array(48000), 48000).length).toBe(16000);
  });

  it('PCM chegaralari: -1..1 dan tashqari qiymatlar kesiladi', () => {
    expect([...floatTo16BitPcm(new Float32Array([2, -2, 0]))]).toEqual([32767, -32768, 0]);
  });

  it('base64 ikki tomonga', () => {
    const bytes = new Uint8Array(70000).map((_, i) => i % 256);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it('jim yoki juda qisqa yozuv yuborilmaydi', () => {
    expect(recordingToWavBase64([new Float32Array(48000)], 48000)).toBeNull(); // 1 s jimlik
    expect(recordingToWavBase64([new Float32Array(4800).fill(0.5)], 48000)).toBeNull(); // 0.1 s
    const tone = new Float32Array(48000).map((_, i) => Math.sin(i / 10) * 0.3);
    const r = recordingToWavBase64([tone], 48000);
    expect(r?.seconds).toBeCloseTo(1, 1);
  });

  it('Gemini TTS PCM: chastota va qiymatlar', () => {
    expect(parsePcmRate('audio/L16;codec=pcm;rate=24000')).toBe(24000);
    expect(parsePcmRate('audio/l16')).toBe(24000);
    const f = pcm16ToFloat32(new Uint8Array([0x00, 0x40, 0x00, 0xc0])); // 16384, -16384
    expect([...f]).toEqual([0.5, -0.5]);
  });
});

describe('ovoz holat mashinasi', () => {
  const run = (events: VoiceEvent[], start: VoiceState = 'idle') =>
    events.reduce<VoiceState | null>((s, e) => (s ? transition(s, e) : null), start);

  it('to‘liq yo‘l: tinglash → matn → tahrir → javob → gapirish → kutish', () => {
    expect(run(['START_LISTENING', 'STOP_LISTENING', 'TRANSCRIBED', 'SEND', 'SPEAK', 'SPEECH_END'])).toBe(
      'idle',
    );
  });

  it('noto‘g‘ri ketma-ketliklar rad etiladi', () => {
    expect(transition('idle', 'STOP_LISTENING')).toBeNull();
    expect(transition('listening', 'SPEAK')).toBeNull(); // tinglayotganda gapirmaydi
    expect(transition('transcribing', 'START_LISTENING')).toBeNull(); // bir vaqtda ikki audio jarayon yo‘q
    expect(transition('thinking', 'START_LISTENING')).toBeNull();
    expect(transition('idle', 'SEND')).toBeNull();
  });

  it('istalgan holatdan bekor qilish va xato', () => {
    for (const s of ['listening', 'transcribing', 'review', 'thinking', 'speaking'] as VoiceState[]) {
      expect(transition(s, 'CANCEL')).toBe('idle');
      expect(transition(s, 'FAIL')).toBe('error');
    }
  });

  it('gapirayotganda mikrofon bosilsa, gapirish to‘xtab tinglash boshlanadi', () => {
    expect(transition('speaking', 'START_LISTENING')).toBe('listening');
  });
});
