import { rms, rmsToLevel } from './level';

export type MicErrorKind = 'denied' | 'notFound' | 'busy' | 'unknown';

export class MicError extends Error {
  constructor(public readonly kind: MicErrorKind) {
    super(kind);
  }
}

function classify(error: unknown): MicErrorKind {
  const name = error instanceof DOMException || error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'notFound';
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy';
  return 'unknown';
}

const MAX_RECORD_SECONDS = 35;

/**
 * Mikrofon kirishi (push-to-talk).
 * - Ovoz balandligi va to'lqin shakli shar animatsiyasi uchun o'qiladi.
 * - Yozuv faqat XOTIRADA turadi: diskka yozilmaydi va `stop()` dan keyin o'chiriladi.
 *   U faqat foydalanuvchi rozilik bergan bo'lsa matnga aylantirish uchun yuboriladi (VoiceService).
 */
export class MicInput {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private buffer: Float32Array<ArrayBuffer> = new Float32Array(1024);
  private chunks: Float32Array[] = [];
  private recordedSamples = 0;

  get active(): boolean {
    return this.stream !== null;
  }

  async start(options: { record: boolean }): Promise<void> {
    if (this.stream) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        video: false,
      });
    } catch (error) {
      throw new MicError(classify(error));
    }
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser); // destination'ga ulanmaydi: ovoz qaytib eshittirilmaydi

    this.chunks = [];
    this.recordedSamples = 0;
    if (options.record) {
      // ScriptProcessor Chromium'da barqaror ishlaydi; chiqishi 0 gain orqali jim
      const processor = context.createScriptProcessor(4096, 1, 1);
      const mute = context.createGain();
      mute.gain.value = 0;
      const maxSamples = MAX_RECORD_SECONDS * context.sampleRate;
      processor.onaudioprocess = (e) => {
        if (this.recordedSamples >= maxSamples) return;
        const data = new Float32Array(e.inputBuffer.getChannelData(0));
        this.chunks.push(data);
        this.recordedSamples += data.length;
      };
      source.connect(processor);
      processor.connect(mute);
      mute.connect(context.destination);
      this.processor = processor;
    }

    this.buffer = new Float32Array(analyser.fftSize);
    this.stream = stream;
    this.context = context;
    this.analyser = analyser;
  }

  /** Mikrofonni o'chiradi va yozuvni qaytaradi (yozuv rejimi bo'lmasa bo'sh). */
  stop(): { chunks: Float32Array[]; sampleRate: number } {
    const result = { chunks: this.chunks, sampleRate: this.context?.sampleRate ?? 48_000 };
    if (this.processor) this.processor.onaudioprocess = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.context?.close().catch(() => undefined);
    this.stream = null;
    this.context = null;
    this.analyser = null;
    this.processor = null;
    this.chunks = [];
    this.recordedSamples = 0;
    return result;
  }

  /** 0..1 ovoz balandligi */
  readLevel(): number {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.buffer);
    return rmsToLevel(rms(this.buffer));
  }

  /** Oxirgi o'qilgan to'lqin shakli (readLevel'dan keyin chaqiriladi) */
  waveform(): Float32Array | null {
    return this.analyser ? this.buffer : null;
  }
}
