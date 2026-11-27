// Enum qiymatlarining o'zbekcha yorliqlari (UI bo'ylab yagona terminlar).

export const STATUS_LABELS = {
  RUNNING: 'Ishlayapti',
  STANDBY: 'Kutish rejimida',
  STOPPED: "To'xtagan",
  WARNING: 'Ogohlantirish',
  OFFLINE: "Aloqa yo'q",
} as const;
export type EquipmentStatusName = keyof typeof STATUS_LABELS;

export const SEVERITY_LABELS = { INFO: "Ma'lumot", WARNING: 'Ogohlantirish', CRITICAL: 'Jiddiy' } as const;
export type SeverityName = keyof typeof SEVERITY_LABELS;

export const ALERT_STATUS_LABELS = {
  NEW: 'Yangi',
  ACKNOWLEDGED: "Ko'rib chiqilmoqda",
  RESOLVED: 'Hal qilindi',
  DISMISSED: 'Rad etildi',
} as const;
export type AlertStatusName = keyof typeof ALERT_STATUS_LABELS;

export const RULE_LABELS = {
  NO_PRODUCTION_SIGNAL: 'Sarf bor, ishlab chiqarish signali yo‘q',
  ABOVE_BASELINE: 'Quvvat odatiydan yuqori',
  NO_DATA: "Ma'lumot kelmayapti",
  SUDDEN_CHANGE: "Sarf keskin o'zgardi",
  LONG_STANDBY: 'Uzoq kutish rejimi',
} as const;
export type AlertRuleName = keyof typeof RULE_LABELS;

export const CONFIDENCE_LABELS = { LOW: 'Past', MEDIUM: "O'rta", HIGH: 'Yuqori' } as const;
export type ConfidenceName = keyof typeof CONFIDENCE_LABELS;

export const SOURCE_LABELS = { DEMO: "Demo ma'lumot", REAL: "Real o'lchov" } as const;

export const CONTROL_STATUS_LABELS = {
  PENDING: 'Tasdiq kutilmoqda',
  EXECUTED_SIMULATED: 'Simulyatsiyada bajarildi',
  REJECTED: 'Rad etildi',
  CANCELLED: 'Bekor qilindi',
  FAILED: 'Xato',
} as const;

export const CONTROL_ACTION_LABELS = { STOP: "To'xtatish", START: 'Ishga tushirish' } as const;

export const INDUSTRIES = [
  'Metallga ishlov berish',
  "Yog'ochga ishlov berish / CNC",
  'Oziq-ovqat',
  "To'qimachilik",
  'Qadoqlash',
  'Kimyo va plastmassa',
  'Qurilish materiallari',
  'Boshqa',
] as const;

export const DEFAULT_CATEGORIES = [
  'CNC stanok',
  'Kompressor',
  'Konveyer',
  'Pech / issiqlik uskunasi',
  'Nasos',
  'Ventilyatsiya',
  'Yoritish',
  'Boshqa',
];

export const CURRENCIES = ['UZS', 'USD', 'EUR', 'KZT', 'RUB'] as const;

export const TIME_ZONES = [
  'Asia/Tashkent',
  'Asia/Samarkand',
  'Asia/Almaty',
  'Asia/Bishkek',
  'Asia/Dushanbe',
  'Europe/Moscow',
  'Europe/Istanbul',
  'UTC',
] as const;
