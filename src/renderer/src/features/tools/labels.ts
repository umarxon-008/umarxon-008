import type { PermissionLevel, ToolActivityStatus } from '@shared/ipc';

export const LEVEL_LABELS: Record<PermissionLevel, { title: string; hint: string }> = {
  0: { title: '0 · Faqat o‘qish', hint: 'Tizim holatini o‘qiydi, hech narsa o‘zgarmaydi.' },
  1: { title: '1 · Ruxsatli o‘qish', hint: 'Dasturlar yoki oynalar ro‘yxatini o‘qiydi.' },
  2: { title: '2 · Qaytariladigan amal', hint: 'Dastur ochish kabi amal. Fayllar o‘zgarmaydi.' },
  3: { title: '3 · Muhim amal', hint: 'O‘zgarishlarni qaytarish qiyin bo‘lishi mumkin.' },
};

export const STATUS_LABELS: Record<ToolActivityStatus, string> = {
  running: 'Bajarilmoqda…',
  awaiting_confirmation: 'Tasdiq kutilmoqda',
  success: 'Bajarildi',
  unverified: 'Buyruq yuborildi, natija tekshirilmadi',
  denied: 'Bekor qilindi',
  error: 'Xato',
  unknown: 'Noma’lum (ilova yopilib qolgan)',
};
