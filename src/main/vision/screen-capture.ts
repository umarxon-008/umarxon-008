import type { BrowserWindow } from 'electron';
import { AppError } from '../ipc/router';

export interface ScreenShot {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png';
  width: number;
  height: number;
}

/** Faqat foydalanuvchi tasdiqlagandan keyin chaqiriladi. Rasm faylga yozilmaydi, faqat xotirada turadi. */
export interface ScreenCapturer {
  capture(): Promise<ScreenShot>;
}

/** Vision modellar uchun yetarli o'lcham: kattaroq rasm faqat trafik va vaqtni oshiradi */
const MAX_WIDTH = 1600;

export function scaledSize(
  width: number,
  height: number,
  max = MAX_WIDTH,
): { width: number; height: number } {
  const k = Math.min(1, max / Math.max(1, width));
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) };
}

/**
 * Asosiy monitor rasmi (Electron desktopCapturer, main process).
 * MARIUS oynasi rasm olish paytida bir lahzaga yashiriladi, so'ng qaytadi:
 * foydalanuvchi buni ko'radi va rasmda MARIUS emas, ortidagi ekran bo'ladi.
 */
export function createElectronCapturer(getWindow: () => BrowserWindow | null): ScreenCapturer {
  return {
    async capture() {
      const { desktopCapturer, screen } = await import('electron');
      const display = screen.getPrimaryDisplay();
      const size = scaledSize(
        Math.round(display.size.width * display.scaleFactor),
        Math.round(display.size.height * display.scaleFactor),
      );
      const win = getWindow();
      const hide = Boolean(win && win.isVisible() && !win.isMinimized());
      if (hide) win!.hide();
      try {
        if (hide) await new Promise((r) => setTimeout(r, 350));
        const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: size });
        const src = sources.find((s) => s.display_id === String(display.id)) ?? sources[0];
        if (!src || src.thumbnail.isEmpty()) throw new AppError('SCREEN_CAPTURE_FAILED');
        const img = src.thumbnail;
        const { width, height } = img.getSize();
        return { base64: img.toJPEG(80).toString('base64'), mimeType: 'image/jpeg', width, height };
      } finally {
        if (hide && win && !win.isDestroyed()) {
          win.show();
          win.focus();
        }
      }
    },
  };
}

/** 1×1 PNG: FAQAT test/dev (MARIUS_FAKE_OS=1) uchun, haqiqiy ekran olinmaydi */
const FAKE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkqPtfDwAEggHBf6zG5QAAAABJRU5ErkJggg==';

export function createFakeCapturer(): ScreenCapturer & { count: number } {
  const c = {
    count: 0,
    async capture(): Promise<ScreenShot> {
      c.count++;
      return { base64: FAKE_PNG, mimeType: 'image/png', width: 1, height: 1 };
    },
  };
  return c;
}
