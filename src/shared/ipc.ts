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

  /* --- Internet (PHASE 6) --- */
  searchEngine: z.enum(['google', 'bing', 'duckduckgo', 'yandex']),

  /* --- Xotira va eslatmalar (PHASE 7) --- */
  /** O'chirilsa, xotira modelga yuborilmaydi va yangi yozuv qo'shilmaydi */
  memoryEnabled: z.boolean(),
  /** Oyna yopilganda MARIUS tray'da qoladi (eslatmalar ishlashi uchun) */
  minimizeToTray: z.boolean(),
  /** Windows bilan birga ishga tushish (prompt §23: standart holatda o'chiq) */
  launchAtLogin: z.boolean(),

  /* --- Ekran tahlili (PHASE 8) --- */
  /** Standart holatda o'chiq. Yoqilgan bo'lsa ham har bir skrinshot alohida tasdiqlanadi. */
  screenAnalysisEnabled: z.boolean(),
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
  searchEngine: 'google',
  memoryEnabled: true,
  minimizeToTray: false,
  launchAtLogin: false,
  screenAnalysisEnabled: false,
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

/* ===================== Vositalar (tools), audit, kompyuter ===================== */

/** Ruxsat darajalari (prompt §20.2). 4 = taqiqlangan: bunday vosita registry'da umuman yo'q. */
export const PermissionLevelSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);
export type PermissionLevel = z.infer<typeof PermissionLevelSchema>;

export const ToolActivityStatusSchema = z.enum([
  'running',
  'awaiting_confirmation',
  'success',
  'unverified',
  'denied',
  'error',
  'unknown',
]);
export type ToolActivityStatus = z.infer<typeof ToolActivityStatusSchema>;

/** Suhbatda ko'rinadigan amal kartasi */
export const ToolActivitySchema = z.object({
  id: z.string().uuid(),
  messageId: z.string().uuid().nullable(),
  toolId: z.string(),
  title: z.string(),
  summary: z.string(),
  status: ToolActivityStatusSchema,
  resultMessage: z.string().nullable(),
  permissionLevel: PermissionLevelSchema,
  createdAt: z.string(),
});
export type ToolActivity = z.infer<typeof ToolActivitySchema>;

export const ConfirmationRequestSchema = z.object({
  id: z.string().uuid(),
  toolId: z.string(),
  /** MARIUS nima qilmoqchi */
  action: z.string(),
  /** Qaysi dastur/oyna/joyga ta'sir qiladi */
  target: z.string(),
  /** Natijada nima o'zgaradi */
  effect: z.string(),
  permissionLevel: PermissionLevelSchema,
  /** Yoziladigan matnning oldindan ko'rinishi (Obsidian note va h.k.) */
  preview: z.string().nullable(),
  expiresAt: z.string(),
});
export type ConfirmationRequest = z.infer<typeof ConfirmationRequestSchema>;
export const TOOL_CONFIRM_CHANNEL = 'tool:confirm';

export const AuditEntrySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
  toolId: z.string(),
  summary: z.string(),
  permissionLevel: PermissionLevelSchema,
  source: z.enum(['ai', 'user']),
  confirmation: z.enum(['not_required', 'approved', 'denied', 'timeout', 'user_initiated']),
  status: ToolActivityStatusSchema,
  errorCode: z.string().nullable(),
  durationMs: z.number().nullable(),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

export const AppEntrySchema = z.object({ id: z.string(), name: z.string() });
export type AppEntry = z.infer<typeof AppEntrySchema>;

export const WindowEntrySchema = z.object({
  pid: z.number().int().positive(),
  app: z.string(),
  title: z.string(),
});
export type WindowEntry = z.infer<typeof WindowEntrySchema>;

/** Bitta OS jarayoni (Windows: Get-Process). cpuPercent: 1 soniyalik o'lchov, barcha yadrolarga nisbatan */
export const ProcessEntrySchema = z.object({
  pid: z.number().int().positive(),
  name: z.string(),
  memoryBytes: z.number().nonnegative(),
  cpuPercent: z.number().nonnegative().nullable(),
  /** 0 = Windows xizmatlari (services) */
  sessionId: z.number().int().nonnegative(),
  title: z.string(),
});
export type ProcessEntry = z.infer<typeof ProcessEntrySchema>;

/** Task Manager kabi: bir nomdagi jarayonlar bitta qatorda (masalan, Chrome'ning 12 ta jarayoni) */
export const ProcessGroupSchema = z.object({
  name: z.string(),
  count: z.number().int().positive(),
  memoryBytes: z.number().nonnegative(),
  cpuPercent: z.number().nonnegative().nullable(),
  /** Oyna sarlavhasi (ishonchsiz matn) */
  title: z.string().nullable(),
  hasWindow: z.boolean(),
  /** Tizim jarayoni yoki MARIUS'ning o'zi: yopib bo'lmaydi */
  protected: z.boolean(),
});
export type ProcessGroup = z.infer<typeof ProcessGroupSchema>;

/** Media va ovoz tugmalari (PHASE 9): faqat shu ro'yxat, boshqa tugma bosilmaydi */
export const MediaActionSchema = z.enum([
  'volume_up',
  'volume_down',
  'mute',
  'play_pause',
  'next_track',
  'previous_track',
]);
export type MediaAction = z.infer<typeof MediaActionSchema>;

export const ActionResultSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
  verified: z.boolean().nullable(),
});
export type ActionResult = z.infer<typeof ActionResultSchema>;

export const ComputerInfoSchema = z.object({
  supported: z.boolean(),
  platform: z.string(),
  osName: z.string(),
  cpuModel: z.string(),
  cores: z.number(),
  memoryTotalBytes: z.number(),
  uptimeSeconds: z.number(),
  battery: z.object({ percent: z.number(), charging: z.boolean() }).nullable(),
});
export type ComputerInfo = z.infer<typeof ComputerInfoSchema>;

/* ===================== Fayllar (PHASE 5) ===================== */

export const FolderKeySchema = z.enum(['documents', 'downloads', 'desktop', 'pictures', 'music', 'videos']);
export type FolderKey = z.infer<typeof FolderKeySchema>;

export const AllowedFolderSchema = z.object({
  id: z.string(),
  path: z.string(),
  label: z.string(),
  exists: z.boolean(),
});
export type AllowedFolderInfo = z.infer<typeof AllowedFolderSchema>;

export const FolderSuggestionSchema = z.object({
  key: FolderKeySchema,
  label: z.string(),
  path: z.string(),
  added: z.boolean(),
});
export type FolderSuggestion = z.infer<typeof FolderSuggestionSchema>;

export const FileHitSchema = z.object({
  path: z.string(),
  name: z.string(),
  folder: z.string(),
  ext: z.string(),
  size: z.number(),
  modifiedAt: z.string(),
  isDirectory: z.boolean(),
});
export type FileHitInfo = z.infer<typeof FileHitSchema>;

/* ===================== Xotira va eslatmalar (PHASE 7) ===================== */

export const MemoryItemSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  source: z.enum(['user', 'ai_approved']),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MemoryItem = z.infer<typeof MemoryItemSchema>;
export const MAX_MEMORY_LENGTH = 500;

export const ReminderSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  dueAt: z.string(),
  timezone: z.string(),
  status: z.enum(['pending', 'done', 'cancelled']),
  notifiedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Reminder = z.infer<typeof ReminderSchema>;

export type ReminderEvent = { type: 'changed' } | { type: 'fired'; reminder: Reminder; missed: boolean };
export const REMINDER_EVENT_CHANNEL = 'reminders:event';

const IsoDate = z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Sana noto‘g‘ri');

/* ===================== Obsidian va zaxira (PHASE 7B) ===================== */

export const ObsidianStatusSchema = z.object({
  enabled: z.boolean(),
  vaultPath: z.string().nullable(),
  read: z.boolean(),
  create: z.boolean(),
  append: z.boolean(),
  obsidianInstalled: z.boolean(),
  accessible: z.boolean(),
  noteCount: z.number().nullable(),
  lastIndexedAt: z.string().nullable(),
});
export type ObsidianStatus = z.infer<typeof ObsidianStatusSchema>;

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

export const ConversationSchema = ConversationSummarySchema.extend({
  messages: z.array(ChatMessageSchema),
  activities: z.array(ToolActivitySchema),
});
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
  | { type: 'tool'; requestId: string; conversationId: string; messageId: string; activity: ToolActivity }
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
        key: z
          .string()
          .trim()
          .min(10)
          .max(300)
          .regex(
            /^[\x21-\x7e]+$/,
            "Kalitda faqat lotin harflari, raqamlar va belgilar bo'lishi kerak (bo'sh joysiz)",
          ),
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

  'tools:respond': {
    input: z.object({ id: z.string().uuid(), approved: z.boolean() }).strict(),
    output: z.boolean(),
  },
  'audit:list': {
    input: z.object({ limit: z.number().int().min(1).max(500) }).strict(),
    output: z.array(AuditEntrySchema),
  },
  'audit:clear': { input: NoInput, output: z.void() },
  'computer:info': { input: NoInput, output: ComputerInfoSchema },
  'computer:listApps': {
    input: z.object({ refresh: z.boolean() }).strict(),
    output: z.array(AppEntrySchema),
  },
  'computer:launchApp': {
    input: z.object({ appId: z.string().min(1).max(500) }).strict(),
    output: ActionResultSchema,
  },
  'computer:listWindows': { input: NoInput, output: z.array(WindowEntrySchema) },
  'computer:focusWindow': {
    input: z
      .object({
        pid: z
          .number()
          .int()
          .positive()
          .max(2 ** 31),
      })
      .strict(),
    output: ActionResultSchema,
  },

  'computer:listProcesses': {
    input: z.object({ sortBy: z.enum(['memory', 'cpu']) }).strict(),
    output: z.object({ groups: z.array(ProcessGroupSchema), memoryTotalBytes: z.number() }),
  },
  'computer:closeApp': {
    input: z.object({ name: z.string().min(1).max(100), force: z.boolean() }).strict(),
    output: ActionResultSchema,
  },
  'computer:media': {
    input: z.object({ action: MediaActionSchema, steps: z.number().int().min(1).max(10) }).strict(),
    output: ActionResultSchema,
  },
  'vision:analyzeScreen': {
    input: z.object({ question: z.string().trim().min(1).max(500) }).strict(),
    output: z.object({
      ok: z.boolean(),
      message: z.string(),
      description: z.string().nullable(),
    }),
  },

  'files:listFolders': { input: NoInput, output: z.array(AllowedFolderSchema) },
  'files:suggestions': { input: NoInput, output: z.array(FolderSuggestionSchema) },
  'files:addFolder': {
    input: z.discriminatedUnion('source', [
      z.object({ source: z.literal('dialog') }).strict(),
      z.object({ source: z.literal('suggestion'), key: FolderKeySchema }).strict(),
    ]),
    output: z.array(AllowedFolderSchema),
  },
  'files:removeFolder': {
    input: z.object({ id: z.string().uuid() }).strict(),
    output: z.array(AllowedFolderSchema),
  },
  'files:search': {
    input: z
      .object({
        query: z.string().max(200).optional(),
        extension: z
          .string()
          .max(20)
          .regex(/^\.?\w+$/)
          .optional(),
        folderId: z.string().uuid().optional(),
        modifiedWithinDays: z.number().int().min(1).max(3650).optional(),
      })
      .strict(),
    output: z.object({ results: z.array(FileHitSchema), scanned: z.number(), truncated: z.boolean() }),
  },
  'files:open': {
    input: z.object({ path: z.string().min(1).max(1000) }).strict(),
    output: ActionResultSchema,
  },
  'files:showInFolder': {
    input: z.object({ path: z.string().min(1).max(1000) }).strict(),
    output: ActionResultSchema,
  },

  'youtube:status': {
    input: NoInput,
    output: z.object({ hasKey: z.boolean(), secretStorageAvailable: z.boolean() }),
  },
  'youtube:setKey': {
    input: z
      .object({
        key: z
          .string()
          .trim()
          .min(10)
          .max(300)
          .regex(
            /^[\x21-\x7e]+$/,
            "Kalitda faqat lotin harflari, raqamlar va belgilar bo'lishi kerak (bo'sh joysiz)",
          ),
      })
      .strict(),
    output: ConnectionTestSchema,
  },
  'youtube:deleteKey': { input: NoInput, output: z.void() },

  'memory:list': { input: NoInput, output: z.array(MemoryItemSchema) },
  'memory:create': {
    input: z.object({ content: z.string().trim().min(1).max(MAX_MEMORY_LENGTH) }).strict(),
    output: z.array(MemoryItemSchema),
  },
  'memory:update': {
    input: z
      .object({ id: z.string().uuid(), content: z.string().trim().min(1).max(MAX_MEMORY_LENGTH) })
      .strict(),
    output: z.array(MemoryItemSchema),
  },
  'memory:delete': { input: z.object({ id: z.string().uuid() }).strict(), output: z.array(MemoryItemSchema) },
  'memory:clear': { input: NoInput, output: z.void() },

  'reminders:list': { input: NoInput, output: z.array(ReminderSchema) },
  'reminders:create': {
    input: z
      .object({
        title: z.string().trim().min(1).max(200),
        description: z.string().max(1000).optional(),
        dueAt: IsoDate,
      })
      .strict(),
    output: z.array(ReminderSchema),
  },
  'reminders:update': {
    input: z
      .object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().max(1000).nullable().optional(),
        dueAt: IsoDate.optional(),
      })
      .strict(),
    output: z.array(ReminderSchema),
  },
  'reminders:setStatus': {
    input: z.object({ id: z.string().uuid(), status: z.enum(['pending', 'done', 'cancelled']) }).strict(),
    output: z.array(ReminderSchema),
  },
  'reminders:delete': {
    input: z.object({ id: z.string().uuid() }).strict(),
    output: z.array(ReminderSchema),
  },

  'obsidian:status': { input: NoInput, output: ObsidianStatusSchema },
  'obsidian:update': {
    input: z
      .object({ enabled: z.boolean(), read: z.boolean(), create: z.boolean(), append: z.boolean() })
      .partial()
      .strict(),
    output: ObsidianStatusSchema,
  },
  /** Vault faqat tizim dialogi orqali tanlanadi; "create" — tanlangan joyda yangi "MARIUS Vault" papkasi */
  'obsidian:chooseVault': {
    input: z.object({ mode: z.enum(['existing', 'create']) }).strict(),
    output: ObsidianStatusSchema,
  },
  'obsidian:disconnect': { input: NoInput, output: ObsidianStatusSchema },
  'obsidian:open': { input: NoInput, output: z.void() },
  'obsidian:clearIndex': { input: NoInput, output: ObsidianStatusSchema },

  'data:backup': {
    input: NoInput,
    output: z.object({ saved: z.boolean(), path: z.string().nullable(), message: z.string() }),
  },
  'data:restore': { input: NoInput, output: z.object({ scheduled: z.boolean(), message: z.string() }) },

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
  AI_TOOLS_UNSUPPORTED:
    'Tanlangan model kompyuter amallarini (function calling) qo‘llamaydi, shuning uchun faqat suhbat ishlaydi.',
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
  FOLDER_TOO_BROAD: 'Butun disk yoki butun profil emas, aniq papkani tanlang (masalan, Hujjatlar).',
  OBSIDIAN_NO_VAULT: 'Avval Obsidian Vault papkasini tanlang.',
  REMINDER_IN_PAST: 'Eslatma vaqti o‘tib ketgan. Kelajakdagi vaqtni tanlang.',
  MEMORY_DISABLED: 'Xotira o‘chirilgan. Xotira bo‘limida yoqing.',
  SENSITIVE_MEMORY: 'Parol, karta raqami yoki shunga o‘xshash maxfiy ma’lumot xotiraga saqlanmaydi.',
  NO_ALLOWED_FOLDERS: 'Hali birorta papkaga ruxsat berilmagan. Kompyuter → Fayllar bo‘limida papka qo‘shing.',
  SCREEN_DISABLED: 'Ekran tahlili o‘chirilgan. Sozlamalar → Maxfiylik bo‘limida yoqing.',
  SCREEN_CAPTURE_FAILED: 'Ekran rasmini olib bo‘lmadi.',
  VISION_UNAVAILABLE:
    'Rasmni tushunadigan AI sozlanmagan: Gemini kaliti va modelini kiriting yoki Ollama’da rasmni tushunadigan modelni (masalan, gemma3, llava) tanlang.',
  OS_UNSUPPORTED: 'Bu amal hozircha faqat Windows’da ishlaydi.',
  OS_COMMAND_FAILED: 'Windows buyrug‘i bajarilmadi. Batafsil ma’lumot log faylida.',
  APP_NOT_FOUND: 'Bunday dastur topilmadi. Ro‘yxatni yangilab, qayta urinib ko‘ring.',
  CONFIRMATION_PENDING: 'Avvalgi amal tasdiqlanishi kutilmoqda.',
  SECRET_STORAGE_UNAVAILABLE:
    'Bu kompyuterda kalitni xavfsiz (shifrlangan) saqlab bo‘lmaydi, shuning uchun u saqlanmadi.',
  UNEXPECTED: "Kutilmagan xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
  ...AiErrorMessages,
} as const;
export type ErrorCode = keyof typeof ErrorCodes;

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } };
