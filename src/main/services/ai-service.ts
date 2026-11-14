import type { AiSettings, AiSettingsPatch, ConnectionTest, ProviderId } from '@shared/ipc';
import { AiErrorMessages } from '@shared/ipc';
import { createGeminiProvider } from '../../modules/ai/gemini';
import { createGeminiAudio, type GeminiAudio } from '../../modules/ai/gemini-audio';
import { createOllamaProvider, isLocalUrl } from '../../modules/ai/ollama';
import { createOllamaVision, type OllamaVision } from '../../modules/ai/vision';
import { ProviderError, type AIProvider, type FetchLike } from '../../modules/ai/types';
import type { SecretStore } from '../database/secret-store';
import { GEMINI_SECRET, type ProviderSettingsRepository } from '../database/provider-settings-repository';
import { AppError } from '../ipc/router';

/** Ekran tahlili uchun tanlangan "ko'ra oladigan" model */
export interface VisionBackend {
  provider: ProviderId;
  model: string;
  /** Rasm internet orqali tashqi serverga yuboriladimi */
  cloud: boolean;
  label: string;
  describe(prompt: string, imageBase64: string, mimeType: string, signal?: AbortSignal): Promise<string>;
}

export interface ResolvedProvider {
  provider: AIProvider;
  model: string;
}

/** AI sozlamalari, kalit va provayder obyektlarini boshqaradi. API kalit faqat shu servis ichida ochiladi. */
export class AiService {
  readonly gemini: AIProvider;
  readonly ollama: AIProvider;
  readonly geminiAudio: GeminiAudio;
  readonly ollamaVision: OllamaVision;

  constructor(
    private readonly repo: ProviderSettingsRepository,
    private readonly secrets: SecretStore,
    options: { fetch?: FetchLike; geminiBaseUrl?: string } = {},
  ) {
    this.gemini = createGeminiProvider({
      apiKey: () => this.secrets.get(GEMINI_SECRET),
      ...(options.fetch ? { fetch: options.fetch } : {}),
      ...(options.geminiBaseUrl ? { baseUrl: options.geminiBaseUrl } : {}),
    });
    this.geminiAudio = createGeminiAudio({
      apiKey: () => this.secrets.get(GEMINI_SECRET),
      ...(options.fetch ? { fetch: options.fetch } : {}),
      ...(options.geminiBaseUrl ? { baseUrl: options.geminiBaseUrl } : {}),
    });
    this.ollamaVision = createOllamaVision({
      baseUrl: () => this.repo.get().ollamaBaseUrl,
      ...(options.fetch ? { fetch: options.fetch } : {}),
    });
    this.ollama = createOllamaProvider({
      baseUrl: () => this.repo.get().ollamaBaseUrl,
      ...(options.fetch ? { fetch: options.fetch } : {}),
    });
  }

  hasGeminiKey(): boolean {
    return this.secrets.has(GEMINI_SECRET);
  }

  activeProvider(): ProviderId | null {
    return this.repo.get().provider;
  }

  geminiModel(): string | null {
    return this.repo.get().geminiModel;
  }

  providerFor(id: ProviderId): AIProvider {
    return id === 'gemini' ? this.gemini : this.ollama;
  }

  async getSettings(): Promise<AiSettings> {
    const c = this.repo.get();
    return {
      provider: c.provider,
      gemini: { model: c.geminiModel, hasKey: this.secrets.has(GEMINI_SECRET) },
      ollama: { baseUrl: c.ollamaBaseUrl, model: c.ollamaModel, isLocal: isLocalUrl(c.ollamaBaseUrl) },
      secretStorageAvailable: await this.secrets.isAvailable(),
    };
  }

  async update(patch: AiSettingsPatch): Promise<AiSettings> {
    this.repo.update({
      ...(patch.provider !== undefined ? { provider: patch.provider } : {}),
      ...(patch.geminiModel !== undefined ? { geminiModel: patch.geminiModel } : {}),
      ...(patch.ollamaBaseUrl !== undefined ? { ollamaBaseUrl: patch.ollamaBaseUrl } : {}),
      ...(patch.ollamaModel !== undefined ? { ollamaModel: patch.ollamaModel } : {}),
    });
    return this.getSettings();
  }

  async setGeminiKey(key: string): Promise<AiSettings> {
    await this.secrets.set(GEMINI_SECRET, key.trim());
    this.repo.setSecretRef('gemini', GEMINI_SECRET);
    return this.getSettings();
  }

  async deleteGeminiKey(): Promise<AiSettings> {
    this.secrets.delete(GEMINI_SECRET);
    this.repo.setSecretRef('gemini', null);
    return this.getSettings();
  }

  /** Ulanishni tekshirish: modellar ro'yxatini so'raydi. Natija har doim o'zbekcha xabar bilan qaytadi. */
  async testConnection(id: ProviderId): Promise<ConnectionTest> {
    try {
      const models = await this.providerFor(id).listModels(AbortSignal.timeout(15_000));
      if (models.length === 0) {
        return {
          ok: false,
          models,
          message:
            id === 'ollama'
              ? 'Ollama ishlayapti, lekin birorta model o‘rnatilmagan. Masalan: “ollama pull <model>” buyrug‘ini bajaring.'
              : 'Ulanish bor, lekin mos model topilmadi.',
        };
      }
      return { ok: true, models, message: `Ulanish muvaffaqiyatli. ${models.length} ta model topildi.` };
    } catch (error) {
      if (error instanceof AppError) return { ok: false, models: [], message: error.message };
      const code = error instanceof ProviderError && error.code !== 'CANCELLED' ? error.code : 'AI_TIMEOUT';
      return { ok: false, models: [], message: AiErrorMessages[code] };
    }
  }

  /** Chat uchun faol provayder va model. Sozlanmagan bo'lsa tushunarli xato. */
  async resolve(): Promise<ResolvedProvider> {
    const c = this.repo.get();
    if (c.provider === 'gemini') {
      if (!this.secrets.has(GEMINI_SECRET) || !c.geminiModel) throw new AppError('AI_NOT_CONFIGURED');
      return { provider: this.gemini, model: c.geminiModel };
    }
    if (c.provider === 'ollama') {
      if (!c.ollamaModel) throw new AppError('AI_NOT_CONFIGURED');
      return { provider: this.ollama, model: c.ollamaModel };
    }
    throw new AppError('AI_NOT_CONFIGURED');
  }

  /**
   * Ekran tahlili uchun model. Maxfiylik uchun avval lokal Ollama (faol bo'lsa va rasmni tushunsa),
   * keyin Gemini. Hech biri bo'lmasa VISION_UNAVAILABLE.
   */
  async resolveVision(): Promise<VisionBackend> {
    const c = this.repo.get();
    const ollamaOk = async () => {
      if (!c.ollamaModel) return false;
      try {
        return (await this.ollamaVision.supportsVision(c.ollamaModel)) !== false;
      } catch {
        return false;
      }
    };
    const ollama = (): VisionBackend => ({
      provider: 'ollama',
      model: c.ollamaModel!,
      cloud: !isLocalUrl(c.ollamaBaseUrl),
      label: isLocalUrl(c.ollamaBaseUrl) ? 'lokal Ollama' : 'Ollama (tashqi server)',
      describe: (prompt, image, _mime, signal) =>
        this.ollamaVision.describe(c.ollamaModel!, prompt, image, signal),
    });
    const geminiReady = this.secrets.has(GEMINI_SECRET) && Boolean(c.geminiModel);
    if (c.provider === 'ollama' && (await ollamaOk())) return ollama();
    if (geminiReady) {
      const model = c.geminiModel!;
      return {
        provider: 'gemini',
        model,
        cloud: true,
        label: 'Google Gemini',
        describe: (prompt, image, mime, signal) =>
          this.geminiAudio.describeImage(model, prompt, image, mime, signal),
      };
    }
    if (c.provider !== 'ollama' && (await ollamaOk())) return ollama();
    throw new AppError('VISION_UNAVAILABLE');
  }
}
