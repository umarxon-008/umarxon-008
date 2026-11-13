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

/**
 * Mikrofon kirishi. Faqat ovoz balandligi va to'lqin shakli o'qiladi.
 * Audio YOZILMAYDI, saqlanmaydi va hech qayerga yuborilmaydi.
 */
export class MicInput {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private buffer: Float32Array<ArrayBuffer> = new Float32Array(1024);

  get active(): boolean {
    return this.stream !== null;
  }

  async start(): Promise<void> {
    if (this.stream) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
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
    this.buffer = new Float32Array(analyser.fftSize);
    this.stream = stream;
    this.context = context;
    this.analyser = analyser;
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.context?.close().catch(() => undefined);
    this.stream = null;
    this.context = null;
    this.analyser = null;
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
