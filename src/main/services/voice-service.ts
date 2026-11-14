import { AiErrorMessages, type Settings, type SynthesizeResult } from '@shared/ipc';
import type { GeminiAudio } from '../../modules/ai/gemini-audio';
import { ProviderError } from '../../modules/ai/types';
import { AppError } from '../ipc/router';
import type { Logger } from '../logging/logger';

export interface VoiceServiceDeps {
  settings: () => Settings;
  audio: Pick<GeminiAudio, 'transcribe' | 'synthesize'>;
  /** Gemini kalit saqlangan va chat modeli tanlanganmi (STT shu model bilan ishlaydi) */
  geminiChatModel: () => string | null;
  hasGeminiKey: () => boolean;
  logger: Logger;
}

/** Provayder xatosini foydalanuvchiga o'zbekcha ko'rinadigan IPC xatosiga aylantiradi. */
export async function asAppError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ProviderError) {
      throw new AppError(
        error.code !== 'CANCELLED' && error.code in AiErrorMessages ? error.code : 'AI_TIMEOUT',
      );
    }
    throw error;
  }
}

/**
 * Ovoz servisi. Maxfiylik qoidalari (prompt §8, §20):
 * - audio faqat foydalanuvchi STT'ni yoqib, cloud'ga yuborishga ROZILIK bergan bo'lsa yuboriladi;
 * - audio diskka yozilmaydi va logga tushmaydi (faqat hajmi va davomiyligi).
 */
export class VoiceService {
  constructor(private readonly deps: VoiceServiceDeps) {}

  async transcribe(audioBase64: string, mimeType: string): Promise<string> {
    const s = this.deps.settings();
    if (s.sttProvider === 'off') throw new AppError('VOICE_DISABLED');
    if (!s.sttCloudConsent) throw new AppError('VOICE_CONSENT_REQUIRED');
    const model = this.deps.geminiChatModel();
    if (!this.deps.hasGeminiKey() || !model) throw new AppError('VOICE_NOT_CONFIGURED');

    const started = Date.now();
    const text = await asAppError(() => this.deps.audio.transcribe(model, audioBase64, mimeType));
    this.deps.logger.info('voice.transcribed', {
      bytes: Math.round((audioBase64.length * 3) / 4),
      chars: text.length,
      ms: Date.now() - started,
    });
    return text;
  }

  async synthesize(text: string): Promise<SynthesizeResult> {
    const s = this.deps.settings();
    if (s.ttsEngine !== 'gemini') throw new AppError('TTS_NOT_CONFIGURED');
    if (!this.deps.hasGeminiKey()) throw new AppError('VOICE_NOT_CONFIGURED');
    if (!s.ttsGeminiModel) throw new AppError('TTS_NOT_CONFIGURED');
    const started = Date.now();
    const ttsModel = s.ttsGeminiModel;
    const result = await asAppError(() => this.deps.audio.synthesize(ttsModel, text));
    this.deps.logger.info('voice.synthesized', { chars: text.length, ms: Date.now() - started });
    return result;
  }
}
