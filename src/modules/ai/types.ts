import type { AiErrorCode, ProviderId } from '@shared/ipc';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model: string;
  /** Tizim ko'rsatmasi (MARIUS shaxsiyati va qoidalari) */
  system: string;
  messages: ChatTurn[];
}

export interface ProviderCapabilities {
  streaming: boolean;
  tools: boolean;
  vision: boolean;
  /** Ma'lumot kompyuterdan tashqariga chiqadimi */
  cloud: boolean;
}

/** Barcha AI provayderlar uchun yagona interfeys (ARCHITECTURE §5). */
export interface AIProvider {
  readonly id: ProviderId;
  getCapabilities(): ProviderCapabilities;
  /** Mavjud modellar (API'dan olinadi, nomlar kodga yozilmaydi) */
  listModels(signal?: AbortSignal): Promise<string[]>;
  /** Javobni bo'laklab qaytaradi. Bekor qilish `signal` orqali. */
  streamChat(request: ChatRequest, signal: AbortSignal): AsyncIterable<string>;
}

export type FetchLike = typeof fetch;

export class ProviderError extends Error {
  constructor(
    public readonly code: AiErrorCode | 'CANCELLED',
    public readonly detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
  }

  get retryable(): boolean {
    return ['AI_RATE_LIMITED', 'AI_NETWORK', 'AI_TIMEOUT', 'AI_UNAVAILABLE', 'AI_BAD_RESPONSE'].includes(
      this.code,
    );
  }
}

/** fetch() tashlagan xatoni provayder xatosiga aylantiradi. */
export function mapFetchError(
  error: unknown,
  signal: AbortSignal | undefined,
  localService: boolean,
): ProviderError {
  if (error instanceof ProviderError) return error;
  if (signal?.aborted) {
    const reason: unknown = signal.reason;
    if (reason instanceof DOMException && reason.name === 'TimeoutError')
      return new ProviderError('AI_TIMEOUT');
    if (reason instanceof ProviderError) return reason;
    return new ProviderError('CANCELLED');
  }
  const err = error as { name?: string; cause?: { code?: string } };
  if (err?.name === 'TimeoutError') return new ProviderError('AI_TIMEOUT');
  if (err?.name === 'AbortError') return new ProviderError('CANCELLED');
  const code = err?.cause?.code ?? '';
  if (code === 'ECONNREFUSED') return new ProviderError(localService ? 'AI_UNAVAILABLE' : 'AI_NETWORK', code);
  if (['ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT', 'ENETUNREACH'].includes(code)) {
    return new ProviderError('AI_NETWORK', code);
  }
  return new ProviderError(localService ? 'AI_UNAVAILABLE' : 'AI_NETWORK', String(err?.name ?? 'fetch'));
}

/**
 * Oqim uchun taymer: javob boshlanmasa yoki bo'laklar orasida uzoq jimlik bo'lsa so'rov to'xtatiladi.
 * Foydalanuvchining bekor qilish signali ham shu yerga ulanadi.
 */
export function createStreamGuard(userSignal: AbortSignal, firstChunkMs: number, idleMs: number) {
  const controller = new AbortController();
  const onAbort = () => controller.abort(userSignal.reason);
  if (userSignal.aborted) controller.abort(userSignal.reason);
  else userSignal.addEventListener('abort', onAbort, { once: true });

  let timer: ReturnType<typeof setTimeout> | null = null;
  const arm = (ms: number) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), ms);
  };
  arm(firstChunkMs);

  return {
    signal: controller.signal,
    /** Har bir bo'lak kelganda chaqiriladi */
    touch: () => arm(idleMs),
    dispose: () => {
      if (timer) clearTimeout(timer);
      userSignal.removeEventListener('abort', onAbort);
    },
  };
}
