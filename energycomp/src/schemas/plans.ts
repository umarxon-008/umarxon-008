import { z } from 'zod';

export const PLAN_FEATURES = ['map2d', 'map3d', 'advancedAi', 'advancedAnalytics', 'integrations'] as const;
export type PlanFeature = (typeof PLAN_FEATURES)[number];

export const planUpdateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300),
  priceMonthly: z.number().min(0).max(1_000_000_000).nullable(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  maxFactories: z.number().int().min(1).max(10_000),
  maxEquipment: z.number().int().min(1).max(100_000),
  maxUsers: z.number().int().min(1).max(100_000),
  aiAnalysesPerDay: z.number().int().min(0).max(100_000),
  historyDays: z.number().int().min(1).max(3650),
  features: z.array(z.enum(PLAN_FEATURES)),
});

export const changePlanSchema = z.object({ planKey: z.string().min(1).max(40) });
