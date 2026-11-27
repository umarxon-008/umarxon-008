import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const optionalPositive = z
  .union([z.number(), z.nan(), z.null()])
  .optional()
  .transform((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null))
  .refine((v) => v === null || (v >= 0 && v <= 100_000), "Qiymat 0 va 100 000 oralig'ida bo'lsin");

export const equipmentInputSchema = z
  .object({
    name: z.string().trim().min(2, 'Nomini kiriting').max(100),
    code: z
      .string()
      .trim()
      .min(1, 'Kodni kiriting')
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/, 'Kod faqat lotin harflari, raqam, "-" va "_" dan iborat bo\'lsin'),
    factoryId: z.string().min(1, 'Zavodni tanlang'),
    categoryId: optionalText(40),
    manufacturer: optionalText(100),
    model: optionalText(100),
    location: optionalText(100),
    nominalPowerKw: z
      .number({ error: 'Nominal quvvatni kiriting' })
      .positive("Nominal quvvat musbat bo'lsin")
      .max(100_000, 'Nominal quvvat juda katta'),
    idleThresholdKw: optionalPositive,
    standbyThresholdKw: optionalPositive,
    baselinePowerKw: optionalPositive,
    sensorId: optionalText(80),
    dataSource: z.enum(['DEMO', 'REAL']).default('DEMO'),
    hasProductionSignal: z.boolean().default(false),
    mapX: z.number().min(0).max(10_000).optional(),
    mapY: z.number().min(0).max(10_000).optional(),
  })
  .refine((v) => v.standbyThresholdKw === null || v.standbyThresholdKw <= v.nominalPowerKw, {
    path: ['standbyThresholdKw'],
    message: "Kutish chegarasi nominal quvvatdan oshmasin",
  })
  .refine(
    (v) => v.idleThresholdKw === null || v.standbyThresholdKw === null || v.idleThresholdKw <= v.standbyThresholdKw,
    { path: ['idleThresholdKw'], message: "To'xtash chegarasi kutish chegarasidan kichik bo'lsin" },
  );
export type EquipmentInput = z.input<typeof equipmentInputSchema>;
export type EquipmentData = z.output<typeof equipmentInputSchema>;

export const equipmentPositionSchema = z.object({
  mapX: z.number().min(0).max(10_000),
  mapY: z.number().min(0).max(10_000),
});

export const equipmentListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  factoryId: z.string().max(40).optional(),
  status: z.enum(['RUNNING', 'STANDBY', 'STOPPED', 'WARNING', 'OFFLINE']).optional(),
  categoryId: z.string().max(40).optional(),
  sort: z.enum(['name', 'power', 'status', 'code']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
