import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, "Parol kamida 8 belgidan iborat bo'lsin")
  .max(128, 'Parol juda uzun')
  .regex(/[A-Za-z]/, "Parolda kamida bitta harf bo'lsin")
  .regex(/\d/, "Parolda kamida bitta raqam bo'lsin");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(200)
  .pipe(z.email("Email manzili noto'g'ri"));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Parolni kiriting').max(128),
  remember: z.boolean().optional().default(false),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Ism-familiyani kiriting').max(100),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    organizationName: z.string().trim().min(2, 'Tashkilot nomini kiriting').max(120),
    industry: z.string().trim().min(2, "Sanoat yo'nalishini tanlang").max(80),
    acceptTerms: z.literal(true, { error: 'Foydalanish shartlariga rozilik bildiring' }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Parollar mos kelmadi',
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ token: z.string().min(20).max(200), password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Parollar mos kelmadi' });

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, 'Joriy parolni kiriting'), password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Parollar mos kelmadi' });

export const profileSchema = z.object({ name: z.string().trim().min(2, 'Ismni kiriting').max(100) });
