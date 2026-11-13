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
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  language: 'uz',
  reducedMotion: false,
  onboardingCompleted: false,
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

const NoInput = z.undefined();

export const IPC = {
  'app:getInfo': { input: NoInput, output: AppInfoSchema },
  'settings:getAll': { input: NoInput, output: SettingsSchema },
  'settings:update': { input: SettingsPatchSchema, output: SettingsSchema },
  'logs:openFolder': { input: NoInput, output: z.void() },
} as const;

export type IpcChannel = keyof typeof IPC;
export type IpcInput<C extends IpcChannel> = z.infer<(typeof IPC)[C]['input']>;
export type IpcOutput<C extends IpcChannel> = z.infer<(typeof IPC)[C]['output']>;

export const IPC_CHANNELS = Object.keys(IPC) as IpcChannel[];

export function isIpcChannel(value: unknown): value is IpcChannel {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(IPC, value);
}

/** Xatolik kodlari: foydalanuvchiga o'zbekcha xabar, logga esa kod yoziladi. */
export const ErrorCodes = {
  INVALID_INPUT: "Noto'g'ri ma'lumot yuborildi.",
  UNKNOWN_CHANNEL: 'Bunday amal mavjud emas.',
  FORBIDDEN_SENDER: "Bu so'rov ishonchsiz manbadan keldi va rad etildi.",
  DATABASE_ERROR: "Ma'lumotlar bazasida xatolik yuz berdi.",
  UNEXPECTED: "Kutilmagan xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
} as const;
export type ErrorCode = keyof typeof ErrorCodes;

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } };
