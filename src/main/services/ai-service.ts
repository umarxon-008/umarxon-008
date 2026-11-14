import type { AiSettings, AiSettingsPatch, ConnectionTest, ModelProbeResult, ProviderId } from '@shared/ipc';
import { sortGeminiModels } from '@shared/gemini-models';
import { AiErrorMessages, type AiErrorCode } from '@shared/ipc';
import { createGeminiProvider } from '../../modules/ai/gemini';
import { createGeminiAudio, type GeminiAudio } from '../../modules/ai/gemini-audio';
import { createOllamaProvider, isLocalUrl } from '../../modules/ai/ollama';
import { createOllamaVision, type OllamaVision } from '../../modules/ai/vision';
import { ProviderError, type AIProvider, type FetchLike } from '../../modules/ai/types';
import type { SecretStore } from '../database/secret-store';
import { GEMINI_SECRET, type ProviderSettingsRepository } from '../database/provider-settings-repository';
import { AppError } from '../ipc/router';

/**
 * Gemini ulanish xatosiga aniq maslahat (Google qaytargan sabab bo'yicha).
 * Masalan, Google Cloud / Vertex AI'da yaratilgan kalit Gemini API (AI Studio) uchun ishlamasligi mumkin.
 */
export function geminiHint(detail: string): string | null {
  if (/API_KEY_INVALID|API key not valid/i.test(detail))
    return 'Google bu kalitni qabul qilmadi. Kalitni aistudio.google.com/apikey sahifasida “Create API key” orqali yarating (odatda “AIza” bilan boshlanadi) va to‘liq nusxalang.';
  if (/SERVICE_DISABLED|API_KEY_SERVICE_BLOCKED|has not been used in project|is disabled/i.test(detail))
    return 'Bu kalitga Gemini API (Generative Language API) ruxsat etilmagan. Ehtimol, kalit Google Cloud yoki Vertex AI’da yaratilgan. aistudio.google.com/apikey sahifasida yangi kalit yarating.';
  if (/RESOURCE_EXHAUSTED|429/.test(detail) && /limit: 0\b/.test(detail))
    return 'Bu model bepul kalitda ishlamaydi (bepul limiti 0). Sozlamalar → Sun’iy intellekt → “Ishlaydigan modelni topish” tugmasini bosing.';
  if (/^404\b|NOT_FOUND/.test(detail))
    return 'Bu model sizning kalitingiz uchun mavjud emas yoki eskirgan. Sozlamalar → Sun’iy intellekt → “Ishlaydigan modelni topish” tugmasini bosing.';
  if (/location is not supported|User location/i.test(detail))
    return 'Google Gemini API sizning hududingizda ishlamayapti. VPN yoki proxy ishlatayotgan bo‘lsangiz, o‘chirib ko‘ring; bo‘lmasa Ollama (internetsiz) variantidan foydalaning.';
  if (/PERMISSION_DENIED/i.test(detail))
    return 'Google bu kalit bilan kirishga ruxsat bermadi. aistudio.google.com/apikey sahifasida yangi kalit yaratib ko‘ring.';
  return null;
}

/**
 * Suhbat xatosi uchun foydalanuvchiga ko'rsatiladigan matn: qaysi xizmat (Gemini yoki Ollama) ekanini va
 * Google qaytargan sababni aytadi. Tafsilotda API kalit bo'lmaydi (faqat status va Google xabari).
 */
export function describeProviderError(provider: ProviderId, code: AiErrorCode, detail?: string): string {
  if (provider === 'gemini') {
    const hint = detail ? geminiHint(detail) : null;
    const base =
      hint ??
      (code === 'AI_UNAVAILABLE'
        ? 'Google Gemini serveri hozir javob bermayapti yoki band (bu vaqtinchalik). Bir daqiqadan keyin qayta urinib ko‘ring yoki Sozlamalarda boshqa “flash” modelni tanlang.'
        : code === 'AI_NETWORK'
          ? 'Google Gemini’ga ulanib bo‘lmadi. Internetni tekshiring; VPN, proxy yoki antivirus to‘sayotgan bo‘lishi mumkin.'
          : AiErrorMessages[code]);
    return detail && code !== 'AI_TIMEOUT' ? `${base} (Google javobi: ${detail})` : base;
  }
  if (code === 'AI_UNAVAILABLE' && detail && /^\d{3}\b/.test(detail))
    return `Ollama ishlayapti, lekin xato qaytardi (${detail}). Modelni qayta tanlang yoki Ollama’ni qayta ishga tushiring.`;
  if (code === 'AI_UNAVAILABLE' || code === 'AI_NETWORK')
    return 'Ollama’ga ulanib bo‘lmadi: u o‘rnatilmagan yoki ishga tushirilmagan. Ollama’ni ishga tushiring yoki Sozlamalar → Sun’iy intellekt bo‘limida Gemini’ni tanlang.';
  return AiErrorMessages[code];
}

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

  /** Diagnostika uchun: kalitning o'zi emas, faqat turi va uzunligi */
  async geminiKeyInfo(): Promise<{ stored: boolean; kind: string; length: number }> {
    const key = this.secrets.has(GEMINI_SECRET) ? await this.secrets.get(GEMINI_SECRET) : null;
    if (!key) return { stored: false, kind: '—', length: 0 };
    const kind = key.startsWith('AIza') ? 'AIza…' : key.startsWith('AQ.') ? 'AQ.…' : 'boshqa';
    return { stored: true, kind, length: key.length };
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
      // Kutilmagan xato "vaqt tugadi" deb ko'rsatilmasligi kerak (chalg'itadi)
      const code =
        error instanceof ProviderError
          ? error.code === 'CANCELLED'
            ? 'AI_TIMEOUT'
            : error.code
          : 'AI_NETWORK';
      const detail = error instanceof ProviderError ? (error.detail ?? '') : '';
      const hint = id === 'gemini' ? geminiHint(detail) : null;
      return {
        ok: false,
        models: [],
        message: [hint ?? AiErrorMessages[code], detail && `Google javobi: ${detail}`]
          .filter(Boolean)
          .join(' '),
      };
    }
  }

  /**
   * Shu kalit bilan haqiqatan ishlaydigan Gemini modelini topadi: tavsiya etilganlar tartibida eng ko'pi 8 ta
   * modelga qisqa so'rov yuboriladi, birinchi ishlagani tanlanadi. 404 (model yo'q) va 429 (limit yoki bepul emas)
   * bo'lganlar o'tkazib yuboriladi. Kalit noto'g'ri yoki internet yo'q bo'lsa, darhol to'xtaydi.
   */
  async findGeminiModel(maxProbes = 8): Promise<ModelProbeResult> {
    if (!this.secrets.has(GEMINI_SECRET)) throw new AppError('AI_NOT_CONFIGURED');
    let models: string[];
    try {
      models = await this.gemini.listModels(AbortSignal.timeout(15_000));
    } catch (error) {
      const pe = error instanceof ProviderError ? error : null;
      return {
        model: null,
        tried: [],
        message: describeProviderError(
          'gemini',
          pe && pe.code !== 'CANCELLED' ? pe.code : 'AI_NETWORK',
          pe?.detail,
        ),
      };
    }
    const candidates = sortGeminiModels(models)
      .filter((m) => m.kind !== 'other')
      .slice(0, maxProbes);
    const tried: ModelProbeResult['tried'] = [];
    for (const { name } of candidates) {
      try {
        await this.geminiAudio.probe(name);
        tried.push({ model: name, ok: true, reason: 'ishlaydi' });
        this.repo.update({ provider: 'gemini', geminiModel: name });
        return { model: name, tried, message: `“${name}” modeli ishlayapti va tanlandi.` };
      } catch (error) {
        const pe =
          error instanceof ProviderError ? error : new ProviderError('AI_BAD_RESPONSE', String(error));
        const reason =
          pe.code === 'AI_MODEL_NOT_FOUND'
            ? 'bu kalit uchun mavjud emas'
            : pe.code === 'AI_RATE_LIMITED'
              ? /limit: 0\b/.test(pe.detail ?? '')
                ? 'bepul kalitda ishlamaydi'
                : 'limit tugagan'
              : pe.code === 'AI_UNAVAILABLE'
                ? 'server band'
                : AiErrorMessages[pe.code === 'CANCELLED' ? 'AI_TIMEOUT' : pe.code];
        tried.push({ model: name, ok: false, reason });
        // Kalit yoki internet muammosi: boshqa modellarni sinash befoyda
        if (pe.code === 'AI_AUTH_INVALID' || pe.code === 'AI_NETWORK') {
          return { model: null, tried, message: describeProviderError('gemini', pe.code, pe.detail) };
        }
      }
    }
    const allLimited = tried.length > 0 && tried.every((t) => /limit/.test(t.reason));
    return {
      model: null,
      tried,
      message: allLimited
        ? 'Hamma sinalgan modellarda limit tugagan. Bepul limit odatda bir daqiqadan keyin (kunlik limit esa ertasi kuni) tiklanadi: biroz kutib qayta urinib ko‘ring.'
        : 'Ishlaydigan model topilmadi. Bir ozdan keyin qayta urinib ko‘ring yoki aistudio.google.com’da kalit holatini tekshiring.',
    };
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
