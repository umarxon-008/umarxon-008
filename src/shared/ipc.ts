import { z } from 'zod';

/**
 * Renderer ↔ Main o'rtasidagi yagona IPC shartnomasi.
 * Faqat shu yerda ro'yxatdan o'tgan kanallar mavjud (allowlist).
 * Har bir kanalning kirish va chiqish ma'lumotlari zod bilan tekshiriladi.
 */

export const ThemeSchema = z.enum(['dark', 'light']);
export type Theme = z.infer<typeof ThemeSchema>;

export const SettingsSchema = z.object({
  theme: ThemeSchema,
  language: z.literal('uz'),
  reducedMotion: z.boolean(),
  onboardingCompleted: z.boolean(),
  /** Suhbat tarixini lokal bazada saqlash. O'chirilsa, suhbat faqat ilova ochiq turgan paytda xotirada turadi. */
  saveHistory: z.boolean(),

  /* --- Ovoz (PHASE 3) --- */
  /** Nutqni matnga aylantirish: o'chiq yoki Gemini (cloud) */
  sttProvider: z.enum(['off', 'gemini']),
  /** Foydalanuvchi ovozining Google'ga yuborilishiga aniq rozilik (UI'dagi haqiqiy belgi orqali) */
  sttCloudConsent: z.boolean(),
  /** Matnni ovozga aylantirish: o'chiq, Windows tizim ovozi (lokal) yoki Gemini TTS (cloud, eksperimental) */
  ttsEngine: z.enum(['off', 'system', 'gemini']),
  ttsSystemVoice: z.string().max(200).nullable(),
  ttsGeminiModel: z
    .string()
    .max(200)
    .regex(/^[\w.:\-/]+$/)
    .nullable(),
  ttsRate: z.number().min(0.5).max(2),
  /** Ovozli savolga javobni avtomatik ovoz chiqarib o'qish */
  speakVoiceReplies: z.boolean(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  language: 'uz',
  reducedMotion: false,
  onboardingCompleted: false,
  saveHistory: true,
  sttProvider: 'gemini',
  sttCloudConsent: false,
  ttsEngine: 'system',
  ttsSystemVoice: null,
  ttsGeminiModel: null,
  ttsRate: 1,
  speakVoiceReplies: true,
};

/** Faqat ma'lum kalitlar, noma'lum kalit rad etiladi. */
export const SettingsPatchSchema = SettingsSchema.partial().strict();
export type SettingsPatch = z.infer<typeof SettingsPatchSchema>;

export const AppInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  platform: z.string(),
  electron: z.string(),
  dataDirectory: z.string(),
  databaseFile: z.string(),
  logDirectory: z.string(),
});
export type AppInfo = z.infer<typeof AppInfoSchema>;

const Bytes = z.number().nonnegative();
const Percent = z.number().min(0).max(100);

export const SystemMetricsSchema = z.object({
  cpu: z.object({ percent: Percent.nullable(), cores: z.number().int().nonnegative() }),
  memory: z.object({ totalBytes: Bytes, usedBytes: Bytes, percent: Percent }),
  disk: z.object({ path: z.string(), totalBytes: Bytes, usedBytes: Bytes, percent: Percent }).nullable(),
  online: z.boolean(),
  os: z.object({ name: z.string(), release: z.string(), uptimeSeconds: z.number().nonnegative() }),
  sampledAt: z.string(),
});
export type SystemMetrics = z.infer<typeof SystemMetricsSchema>;

/* ===================== AI provayderlar ===================== */

export const ProviderIdSchema = z.enum(['gemini', 'ollama']);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

const ModelName = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[\w.:\-/]+$/, "Model nomida faqat harf, raqam va . : - / _ bo'lishi mumkin");

const HttpUrl = z
  .string()
  .max(300)
  .refine((v) => {
    try {
      const u = new URL(v);
      return (u.protocol === 'http:' || u.protocol === 'https:') && !u.username && !u.password;
    } catch {
      return false;
    }
  }, 'Manzil http:// yoki https:// bilan boshlanishi kerak');

/** Renderer'ga ko'rinadigan AI sozlamalari. API kalitning o'zi HECH QACHON bu yerda bo'lmaydi. */
export const AiSettingsSchema = z.object({
  provider: ProviderIdSchema.nullable(),
  gemini: z.object({ model: ModelName.nullable(), hasKey: z.boolean() }),
  ollama: z.object({ baseUrl: HttpUrl, model: ModelName.nullable(), isLocal: z.boolean() }),
  secretStorageAvailable: z.boolean(),
});
export type AiSettings = z.infer<typeof AiSettingsSchema>;

export const AiSettingsPatchSchema = z
  .object({
    provider: ProviderIdSchema.nullable(),
    geminiModel: ModelName.nullable(),
    ollamaBaseUrl: HttpUrl,
    ollamaModel: ModelName.nullable(),
  })
  .partial()
  .strict();
export type AiSettingsPatch = z.infer<typeof AiSettingsPatchSchema>;

export const ConnectionTestSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
  models: z.array(z.string()),
});
export type ConnectionTest = z.infer<typeof ConnectionTestSchema>;

/* ===================== Suhbat ===================== */

const Id = z.string().uuid();

export const MessageStatusSchema = z.enum(['complete', 'streaming', 'cancelled', 'error']);
export const ChatMessageSchema = z.object({
  id: Id,
  conversationId: Id,
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  status: MessageStatusSchema,
  provider: ProviderIdSchema.nullable(),
  model: z.string().nullable(),
  errorCode: z.string().nullable(),
  createdAt: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ConversationSummarySchema = z.object({
  id: Id,
  title: z.string(),
  updatedAt: z.string(),
  persisted: z.boolean(),
});
export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;

export const ConversationSchema = ConversationSummarySchema.extend({ messages: z.array(ChatMessageSchema) });
export type Conversation = z.infer<typeof ConversationSchema>;

export const MAX_MESSAGE_LENGTH = 8000;

export const ChatSendInputSchema = z
  .object({
    conversationId: Id.nullable(),
    text: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  })
  .strict();

export const ChatSendResultSchema = z.object({
  conversationId: Id,
  requestId: Id,
  userMessage: ChatMessageSchema,
  assistantMessage: ChatMessageSchema,
});
export type ChatSendResult = z.infer<typeof ChatSendResultSchema>;

/** Main → renderer oqim hodisalari (`chat:event` kanali). */
export type ChatEvent =
  | { type: 'delta'; requestId: string; conversationId: string; messageId: string; text: string }
  | {
      type: 'done';
      requestId: string;
      conversationId: string;
      messageId: string;
      status: 'complete' | 'cancelled';
    }
  | {
      type: 'error';
      requestId: string;
      conversationId: string;
      messageId: string;
      code: AiErrorCode;
      message: string;
      retryable: boolean;
    };

export const CHAT_EVENT_CHANNEL = 'chat:event';

/* ===================== Ovoz ===================== */

/** 30 soniyalik 16 kHz mono WAV ≈ 1 MB, base64'da ≈ 1.3 MB. Chegara zaxira bilan. */
export const MAX_AUDIO_BASE64 = 4 * 1024 * 1024;
export const MAX_TTS_TEXT = 4000;

export const TranscribeInputSchema = z
  .object({
    audio: z
      .string()
      .min(100)
      .max(MAX_AUDIO_BASE64)
      .regex(/^[A-Za-z0-9+/=]+$/, 'base64 emas'),
    mimeType: z.literal('audio/wav'),
  })
  .strict();

export const SynthesizeResultSchema = z.object({
  audio: z.string(),
  mimeType: z.string(),
});
export type SynthesizeResult = z.infer<typeof SynthesizeResultSchema>;

/* ===================== Kanallar ===================== */

const NoInput = z.undefined();
const IdInput = z.object({ id: Id }).strict();

export const IPC = {
  'app:getInfo': { input: NoInput, output: AppInfoSchema },
  'system:getMetrics': { input: NoInput, output: SystemMetricsSchema },
  'settings:getAll': { input: NoInput, output: SettingsSchema },
  'settings:update': { input: SettingsPatchSchema, output: SettingsSchema },
  'logs:openFolder': { input: NoInput, output: z.void() },

  'ai:getSettings': { input: NoInput, output: AiSettingsSchema },
  'ai:updateSettings': { input: AiSettingsPatchSchema, output: AiSettingsSchema },
  'ai:setGeminiKey': {
    input: z
      .object({
        key: z.string().trim().min(10).max(300).regex(/^\S+$/, "Kalitda bo'sh joy bo'lmasligi kerak"),
      })
      .strict(),
    output: AiSettingsSchema,
  },
  'ai:deleteGeminiKey': { input: NoInput, output: AiSettingsSchema },
  'ai:testConnection': {
    input: z.object({ provider: ProviderIdSchema }).strict(),
    output: ConnectionTestSchema,
  },

  'chat:listConversations': { input: NoInput, output: z.array(ConversationSummarySchema) },
  'chat:getConversation': { input: IdInput, output: ConversationSchema },
  'chat:send': { input: ChatSendInputSchema, output: ChatSendResultSchema },
  'chat:regenerate': {
    input: z.object({ conversationId: Id }).strict(),
    output: z.object({ requestId: Id, assistantMessage: ChatMessageSchema }),
  },
  'chat:cancel': { input: z.object({ requestId: Id }).strict(), output: z.boolean() },
  'chat:deleteConversation': { input: IdInput, output: z.void() },
  'chat:clearAll': { input: NoInput, output: z.void() },

  'voice:transcribe': { input: TranscribeInputSchema, output: z.object({ text: z.string() }) },
  'voice:synthesize': {
    input: z.object({ text: z.string().trim().min(1).max(MAX_TTS_TEXT) }).strict(),
    output: SynthesizeResultSchema,
  },
} as const;

export type IpcChannel = keyof typeof IPC;
export type IpcInput<C extends IpcChannel> = z.infer<(typeof IPC)[C]['input']>;
export type IpcOutput<C extends IpcChannel> = z.infer<(typeof IPC)[C]['output']>;

export const IPC_CHANNELS = Object.keys(IPC) as IpcChannel[];

export function isIpcChannel(value: unknown): value is IpcChannel {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(IPC, value);
}

/* ===================== Xatoliklar ===================== */

/** AI provayder xatolari: foydalanuvchiga o'zbekcha, keyingi qadam bilan. */
export const AiErrorMessages = {
  AI_NOT_CONFIGURED:
    'AI hali sozlanmagan. Sozlamalar → Sun’iy intellekt bo‘limida Gemini yoki Ollama’ni ulang.',
  AI_AUTH_INVALID: 'API kalit noto‘g‘ri yoki muddati o‘tgan. Sozlamalarda kalitni tekshiring.',
  AI_RATE_LIMITED: 'So‘rovlar limiti tugadi (bepul limit). Biroz kutib, qayta urinib ko‘ring.',
  AI_NETWORK: 'Internetga ulanib bo‘lmadi. Ulanishni tekshirib, qayta urinib ko‘ring.',
  AI_TIMEOUT: 'AI javob berishi juda uzoq cho‘zildi. Qayta urinib ko‘ring.',
  AI_UNAVAILABLE: 'AI xizmati hozir ishlamayapti. Ollama ishlatilsa, u ishga tushirilganini tekshiring.',
  AI_MODEL_NOT_FOUND: 'Tanlangan model topilmadi. Sozlamalarda boshqa modelni tanlang.',
  AI_BLOCKED: 'AI bu so‘rovga javob berishni xavfsizlik sababli rad etdi.',
  AI_BAD_RESPONSE: 'AI’dan tushunarsiz javob keldi. Qayta urinib ko‘ring.',
} as const;
export type AiErrorCode = keyof typeof AiErrorMessages;

/** Xatolik kodlari: foydalanuvchiga o'zbekcha xabar, logga esa kod yoziladi. */
export const ErrorCodes = {
  INVALID_INPUT: "Noto'g'ri ma'lumot yuborildi.",
  UNKNOWN_CHANNEL: 'Bunday amal mavjud emas.',
  FORBIDDEN_SENDER: "Bu so'rov ishonchsiz manbadan keldi va rad etildi.",
  DATABASE_ERROR: "Ma'lumotlar bazasida xatolik yuz berdi.",
  NOT_FOUND: 'So‘ralgan ma’lumot topilmadi.',
  BUSY: 'MARIUS hali oldingi javobni yozmoqda. Uni to‘xtating yoki kuting.',
  VOICE_DISABLED: 'Ovozni matnga aylantirish o‘chirilgan. Sozlamalar → Ovoz bo‘limida yoqing.',
  VOICE_CONSENT_REQUIRED:
    'Ovozingizni matnga aylantirish uchun u Google serverlariga yuboriladi. Avval Sozlamalar → Ovoz bo‘limida bunga rozilik bering.',
  VOICE_NOT_CONFIGURED:
    'Ovoz uchun Gemini kaliti va modeli kerak. Sozlamalar → Sun’iy intellekt → Gemini bo‘limida kalitni kiriting va modelni tanlang.',
  TTS_NOT_CONFIGURED: 'Gemini ovoz modeli tanlanmagan. Sozlamalar → Ovoz bo‘limida tanlang.',
  SECRET_STORAGE_UNAVAILABLE:
    'Bu kompyuterda kalitni xavfsiz (shifrlangan) saqlab bo‘lmaydi, shuning uchun u saqlanmadi.',
  UNEXPECTED: "Kutilmagan xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
  ...AiErrorMessages,
} as const;
export type ErrorCode = keyof typeof ErrorCodes;

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } };
