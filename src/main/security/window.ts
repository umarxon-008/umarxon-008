import { BrowserWindow, session, shell, type WebPreferences } from 'electron';
import type { Logger } from '../logging/logger';
import { isPermissionAllowed } from './permissions';

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

/** Ruxsat siyosati: `security/permissions.ts` (faqat mikrofon audio, faqat ilova sahifasi). */
export function lockDownPermissions(logger: Logger, isTrustedUrl: (url: string) => boolean): void {
  const ses = session.defaultSession;

  ses.setPermissionRequestHandler((wc, permission, callback, details) => {
    const url = details.requestingUrl || wc.getURL();
    const mediaTypes = 'mediaTypes' in details ? details.mediaTypes : undefined;
    const allowed = isPermissionAllowed({ permission, url, mediaTypes: mediaTypes ?? [] }, isTrustedUrl);
    logger.info(allowed ? 'permission.granted' : 'permission.denied', { permission, mediaTypes });
    callback(allowed);
  });

  ses.setPermissionCheckHandler((wc, permission, _origin, details) => {
    const url = details.requestingUrl || wc?.getURL() || '';
    return isPermissionAllowed({ permission, url, mediaType: details.mediaType }, isTrustedUrl);
  });

  ses.setDevicePermissionHandler(() => false);
}
