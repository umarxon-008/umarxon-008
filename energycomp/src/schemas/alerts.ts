import { z } from 'zod';

export const alertListQuerySchema = z.object({
  status: z.enum(['NEW', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED', 'OPEN', 'ALL']).default('OPEN'),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).optional(),
  equipmentId: z.string().max(40).optional(),
  rule: z.enum(['NO_PRODUCTION_SIGNAL', 'ABOVE_BASELINE', 'NO_DATA', 'SUDDEN_CHANGE', 'LONG_STANDBY']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const alertStatusSchema = z.object({
  status: z.enum(['ACKNOWLEDGED', 'RESOLVED', 'DISMISSED', 'NEW']),
  note: z.string().trim().max(500).optional(),
});

export const aiFeedbackSchema = z.object({ feedback: z.enum(['HELPFUL', 'NOT_HELPFUL']) });

export const controlRequestSchema = z.object({
  equipmentId: z.string().min(1).max(40),
  action: z.enum(['STOP', 'START']),
  reason: z.string().trim().min(5, "Sababni kamida 5 belgida yozing").max(500),
  safetyConfirmed: z.literal(true, { error: 'Xavfsizlik shartlarini tasdiqlang' }),
});

export const controlReviewSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  note: z.string().trim().max(500).optional(),
});
