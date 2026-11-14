import type { ZodType } from 'zod';
import type { PermissionLevel } from '@shared/ipc';

/** Modelga qaytariladigan natija. `data` ichidagi tashqi matn (oyna nomlari va h.k.) ishonchsiz deb belgilanadi. */
export interface ToolOutput {
  ok: boolean;
  /** Foydalanuvchiga ko'rsatiladigan qisqa o'zbekcha natija */
  message: string;
  /** Natija haqiqatda tekshirildimi (§6.5). null: tekshirish kerak emas yoki imkonsiz */
  verified: boolean | null;
  data?: unknown;
  errorCode?: string;
}

export interface ConfirmationCard {
  action: string;
  target: string;
  effect: string;
  /** Yoziladigan matnning oldindan ko'rinishi */
  preview?: string;
}

/** prepare() natijasi: darhol javob yoki tasdiq talab qiladigan amal */
export type Prepared =
  | { kind: 'done'; output: ToolOutput }
  | { kind: 'action'; confirm: ConfirmationCard; run: (signal: AbortSignal) => Promise<ToolOutput> };

/** Vosita manifesti (prompt §17): id, ruxsatlar, sxemalar, timeout, audit siyosati */
export interface ToolManifest<I = unknown> {
  id: string;
  version: string;
  /** UI va audit uchun o'zbekcha nom */
  title: string;
  /** Model uchun tavsif */
  description: string;
  permissionLevel: PermissionLevel;
  /** 'always': AI chaqirganda har safar foydalanuvchi tasdig'i (bir martalik) */
  confirmation: 'never' | 'always';
  /** true: foydalanuvchi o'zi tugmani bossa ham tasdiq oynasi chiqadi (masalan, ekran rasmi: ogohlantirishni ko'rsatish uchun) */
  confirmEvenForUser?: boolean;
  input: ZodType<I>;
  timeoutMs: number;
  /** Audit uchun qisqa tavsif: maxfiy qiymatlar yozilmaydi */
  summarize(input: I): string;
  prepare(input: I): Promise<Prepared>;
}

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}
