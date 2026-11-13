import { BrowserWindow, session, shell, type WebPreferences } from 'electron';
import type { Logger } from '../logging/logger';

/** Barcha oynalar uchun majburiy xavfsiz sozlamalar (ARCHITECTURE §2). */
export function secureWebPreferences(preloadPath: string, options: { devTools: boolean }): WebPreferences {
  return {
    preload: preloadPath,
    contextIsolation: true,
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    nodeIntegrationInSubFrames: false,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    webviewTag: false,
    spellcheck: false,
    devTools: options.devTools,
  };
}

/** Faqat https havolalar tizim brauzerida ochiladi. Boshqa sxemalar rad etiladi. */
export function isSafeExternalUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function hardenWindow(
  win: BrowserWindow,
  isAllowedNavigation: (url: string) => boolean,
  logger: Logger,
): void {
  const contents = win.webContents;

  // Yangi oyna ochishni bloklash; https havolalar tizim brauzerida ochiladi.
  contents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) void shell.openExternal(url);
    else logger.warn('window.open_blocked', { url });
    return { action: 'deny' };
  });

  // Ilova sahifasidan boshqa joyga o'tishni bloklash.
  contents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault();
      logger.warn('window.navigation_blocked', { url });
    }
  });

  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
}

/**
 * Ruxsat so'rovlari (mikrofon, kamera, joylashuv, bildirishnoma va h.k.) hozircha hammasi rad etiladi.
 * Mikrofon PHASE 3 da aniq va boshqariladigan tarzda yoqiladi.
 */
export function lockDownPermissions(logger: Logger): void {
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    logger.info('permission.denied', { permission });
    callback(false);
  });
  ses.setPermissionCheckHandler(() => false);
}
