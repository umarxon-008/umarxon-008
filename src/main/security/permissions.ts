/**
 * Ruxsat siyosati (Electron'ga bog'liq emas, unit testda sinaladi).
 *
 * Faqat bitta ruxsat beriladi: MIKROFON (faqat audio, kamera emas), va faqat ilovaning o'z sahifasiga.
 * Renderer mikrofonni faqat foydalanuvchi mikrofon tugmasini bosganda so'raydi.
 * Audio yozilmaydi va saqlanmaydi: faqat ovoz balandligi animatsiya uchun hisoblanadi.
 * Qolgan barcha ruxsatlar (kamera, joylashuv, bildirishnoma, ekran, clipboard va h.k.) rad etiladi.
 */
export interface PermissionQuery {
  permission: string;
  /** So'rov yuborgan sahifa manzili */
  url: string;
  /** Request handler: so'ralayotgan media turlari */
  mediaTypes?: readonly string[] | undefined;
  /** Check handler: tekshirilayotgan media turi */
  mediaType?: string | undefined;
}

export function isPermissionAllowed(query: PermissionQuery, isTrustedUrl: (url: string) => boolean): boolean {
  if (query.permission !== 'media') return false;
  if (!isTrustedUrl(query.url)) return false;

  if (query.mediaTypes !== undefined) {
    return query.mediaTypes.length > 0 && query.mediaTypes.every((t) => t === 'audio');
  }
  return query.mediaType === 'audio';
}
