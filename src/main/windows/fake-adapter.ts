import type { AppEntry, MediaAction, WindowEntry } from '@shared/ipc';
import type { OsAdapter } from './os-adapter';
import { AppError } from '../ipc/router';

/**
 * FAQAT development/test uchun soxta OS (MARIUS_FAKE_OS=1, paketlangan ilovada ishlamaydi).
 * Haqiqiy dasturlarni ochmasdan butun zanjirni (AI → tasdiq → amal → audit → tekshirish) sinash imkonini beradi.
 */
export function createFakeAdapter(): OsAdapter & { launched: string[]; mediaKeys: string[] } {
  const apps: AppEntry[] = [
    { id: 'Microsoft.WindowsCalculator_8wekyb3d8bbwe!App', name: 'Calculator' },
    { id: 'Microsoft.WindowsNotepad_8wekyb3d8bbwe!App', name: 'Notepad' },
    { id: 'Chrome', name: 'Google Chrome' },
    { id: 'Microsoft.VisualStudioCode', name: 'Visual Studio Code' },
    { id: 'TelegramDesktop', name: 'Telegram Desktop' },
    { id: 'Microsoft.Office.WINWORD.EXE.15', name: 'Word' },
  ];
  const windows: WindowEntry[] = [{ pid: 4242, app: 'explorer', title: 'Downloads' }];
  let nextPid = 5000;
  const launched: string[] = [];
  const mediaKeys: string[] = [];

  return {
    kind: 'fake',
    supported: true,
    launched,
    mediaKeys,
    listApps: async () => apps,
    launchApp: async (app) => {
      launched.push(app.name);
      const process = app.name === 'Calculator' ? 'CalculatorApp' : app.name.split(' ')[0]!.toLowerCase();
      windows.push({ pid: nextPid++, app: process, title: app.name });
    },
    listWindows: async () => windows.map((w) => ({ ...w })),
    focusWindow: async (pid) => windows.some((w) => w.pid === pid),
    battery: async () => ({ percent: 76, charging: false }),
    sendMediaKey: async (action: MediaAction, steps: number) => {
      mediaKeys.push(`${action}×${steps}`);
    },
  };
}

export function createUnsupportedAdapter(): OsAdapter {
  const fail = () => Promise.reject(new AppError('OS_UNSUPPORTED'));
  return {
    kind: 'unsupported',
    supported: false,
    listApps: fail,
    launchApp: fail,
    listWindows: fail,
    focusWindow: fail,
    battery: async () => null,
    sendMediaKey: fail,
  };
}
