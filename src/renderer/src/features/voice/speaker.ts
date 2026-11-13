import { rms, rmsToLevel } from './level';
import { base64ToBytes, parsePcmRate, pcm16ToFloat32 } from './wav';
import { speechText, splitSentences } from './speechText';

export { isUzbekVoice, speechText, splitSentences } from './speechText';

export type TtsEngine = 'system' | 'gemini';

export interface SpeakOptions {
  engine: TtsEngine;
  /** Windows tizim ovozi nomi (speechSynthesis.getVoices) */
  voiceName: string | null;
  rate: number;
}

export function listSystemVoices(): SpeechSynthesisVoice[] {
  return typeof speechSynthesis === 'undefined' ? [] : speechSynthesis.getVoices();
}

/**
 * MARIUS ovozi. Bir vaqtda faqat bitta o'qish bo'ladi (yangisi eskisini to'xtatadi).
 * Shar animatsiyasi uchun ovoz balandligini beradi.
 */
export class Speaker {
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private buffer: Float32Array<ArrayBuffer> = new Float32Array(1024);
  private pulse = 0;
  private pulseAt = 0;
  private finish: ((r: 'ended' | 'stopped') => void) | null = null;
  private engine: TtsEngine | null = null;
  paused = false;

  get speaking(): boolean {
    return this.finish !== null;
  }

  /** 0..1: Gemini audiosi uchun real balandlik, tizim ovozi uchun so'z chegaralaridagi "pulse" */
  level(now = performance.now()): number {
    if (!this.speaking || this.paused) return 0;
    if (this.analyser) {
      this.analyser.getFloatTimeDomainData(this.buffer);
      return rmsToLevel(rms(this.buffer));
    }
    const decay = Math.max(0, 1 - (now - this.pulseAt) / 260);
    return 0.18 + this.pulse * decay * 0.55 + Math.sin(now / 90) * 0.04;
  }

  waveform(): Float32Array | null {
    return this.analyser ? this.buffer : null;
  }

  async speak(
    text: string,
    options: SpeakOptions,
    synthesize: (t: string) => Promise<{ audio: string; mimeType: string }>,
  ) {
    this.stop();
    const clean = speechText(text);
    if (!clean) return 'ended' as const;
    const done = new Promise<'ended' | 'stopped'>((resolve) => (this.finish = resolve));
    this.engine = options.engine;
    this.paused = false;
    try {
      if (options.engine === 'gemini') await this.playGemini(clean, synthesize);
      else this.playSystem(clean, options);
    } catch (error) {
      this.cleanup();
      this.finish?.('stopped');
      this.finish = null;
      throw error;
    }
    return done;
  }

  private playSystem(text: string, options: SpeakOptions) {
    if (typeof speechSynthesis === 'undefined') throw new Error('speechSynthesis mavjud emas');
    const voice = listSystemVoices().find((v) => v.name === options.voiceName) ?? null;
    const parts = splitSentences(text);
    parts.forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part);
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else {
        u.lang = 'uz-UZ';
      }
      u.rate = options.rate;
      u.onboundary = () => {
        this.pulse = 1;
        this.pulseAt = performance.now();
      };
      if (i === parts.length - 1) u.onend = () => this.end('ended');
      u.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') this.end('stopped');
      };
      speechSynthesis.speak(u);
    });
  }

  private async playGemini(
    text: string,
    synthesize: (t: string) => Promise<{ audio: string; mimeType: string }>,
  ) {
    const { audio, mimeType } = await synthesize(text);
    if (!this.finish) return; // kutish paytida to'xtatildi
    const ctx = new AudioContext();
    const bytes = base64ToBytes(audio);
    let buffer: AudioBuffer;
    if (/wav/i.test(mimeType)) {
      buffer = await ctx.decodeAudioData(bytes.slice().buffer);
    } else {
      const samples = pcm16ToFloat32(bytes);
      buffer = ctx.createBuffer(1, Math.max(1, samples.length), parsePcmRate(mimeType));
      buffer.copyToChannel(samples, 0);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    source.onended = () => this.end('ended');
    this.ctx = ctx;
    this.source = source;
    this.analyser = analyser;
    this.buffer = new Float32Array(analyser.fftSize);
    source.start();
  }

  pause() {
    if (!this.speaking || this.paused) return;
    this.paused = true;
    if (this.engine === 'system') speechSynthesis.pause();
    else void this.ctx?.suspend();
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    if (this.engine === 'system') speechSynthesis.resume();
    else void this.ctx?.resume();
  }

  stop() {
    if (!this.finish) return;
    this.end('stopped');
  }

  private end(reason: 'ended' | 'stopped') {
    const f = this.finish;
    this.finish = null;
    this.cleanup();
    f?.(reason);
  }

  private cleanup() {
    if (this.engine === 'system' && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    if (this.source) {
      this.source.onended = null;
      try {
        this.source.stop();
      } catch {
        /* allaqachon to'xtagan */
      }
    }
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.source = null;
    this.analyser = null;
    this.paused = false;
    this.pulse = 0;
  }
}
