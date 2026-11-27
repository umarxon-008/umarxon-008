import { z } from 'zod';
import { isValidTimeZone } from '@/lib/time';

export const organizationUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Nomini kiriting').max(120),
  industry: z.string().trim().min(2).max(80),
  timezone: z.string().refine(isValidTimeZone, "Vaqt zonasi noto'g'ri"),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Valyuta kodi 3 harfdan iborat (masalan, UZS)'),
});

export const tariffSchema = z.object({
  name: z.string().trim().min(2).max(80),
  pricePerKwh: z.number({ error: 'Narxni kiriting' }).positive("Narx musbat bo'lsin").max(1_000_000),
  validFrom: z.iso.date({ error: "Sana noto'g'ri" }),
});

export const baselineSchema = z
  .object({
    baselineStart: z.iso.date().nullable(),
    baselineEnd: z.iso.date().nullable(),
  })
  .refine((v) => (v.baselineStart === null) === (v.baselineEnd === null), {
    path: ['baselineEnd'],
    message: 'Ikkala sanani kiriting yoki ikkalasini ham bo\'sh qoldiring',
  })
  .refine((v) => !v.baselineStart || !v.baselineEnd || v.baselineStart < v.baselineEnd, {
    path: ['baselineEnd'],
    message: 'Tugash sanasi boshlanishdan keyin bo\'lsin',
  });

export const controlModeSchema = z.object({ controlMode: z.enum(['READ_ONLY', 'SIMULATION']) });

export const factorySchema = z.object({
  name: z.string().trim().min(2, 'Nomini kiriting').max(100),
  address: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
});

export const zoneSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(60),
  x: z.number().min(0).max(10_000),
  y: z.number().min(0).max(10_000),
  width: z.number().min(20).max(10_000),
  height: z.number().min(20).max(10_000),
  color: z.enum(['blue', 'green', 'amber', 'slate', 'violet']).default('blue'),
});
export type Zone = z.infer<typeof zoneSchema>;

export const mapLayoutSchema = z.object({
  width: z.number().int().min(200).max(5000),
  height: z.number().int().min(200).max(5000),
  zones: z.array(zoneSchema).max(50),
});

export const categorySchema = z.object({ name: z.string().trim().min(2).max(40) });

export const memberCreateSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Email manzili noto'g'ri")),
  name: z.string().trim().min(2, 'Ismni kiriting').max(100),
  role: z.enum(['OWNER', 'MANAGER', 'ENGINEER', 'VIEWER']),
});

export const memberUpdateSchema = z.object({ role: z.enum(['OWNER', 'MANAGER', 'ENGINEER', 'VIEWER']) });

export const notificationPrefsSchema = z.object({
  notifyCritical: z.boolean(),
  notifyWarning: z.boolean(),
  notifyInfo: z.boolean(),
  notifyControl: z.boolean(),
});

export const switchOrgSchema = z.object({ organizationId: z.string().min(1).max(40) });
