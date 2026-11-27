import { z } from 'zod';
import { GRANULARITIES } from '@/lib/time';

export const rangeQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  preset: z.enum(['today', '24h', '7d', '30d', 'month', 'custom']).default('7d'),
  granularity: z.enum(GRANULARITIES as [string, ...string[]]).default('day'),
  equipmentId: z.union([z.string().max(40), z.array(z.string().max(40)).max(100)]).optional(),
  factoryId: z.string().max(40).optional(),
});
export type RangeQuery = z.infer<typeof rangeQuerySchema>;

/** Tashqi gateway'lardan HTTP orqali keladigan o'lchovlar (Bearer token bilan). */
export const ingestSchema = z.object({
  readings: z
    .array(
      z.object({
        sensorId: z.string().min(1).max(80),
        timestamp: z.iso.datetime({ offset: true, error: 'timestamp ISO 8601 formatida bo\'lsin' }),
        powerKw: z.number().min(0).max(100_000),
        /** Interval energiyasi (kWh). Berilmasa powerKw * interval dan hisoblanadi. */
        energyKwh: z.number().min(0).max(1_000_000).optional(),
        intervalSeconds: z.number().int().min(1).max(3600).default(60),
        isProducing: z.boolean().optional(),
        productionCount: z.number().int().min(0).optional(),
      }),
    )
    .min(1)
    .max(1000),
});
