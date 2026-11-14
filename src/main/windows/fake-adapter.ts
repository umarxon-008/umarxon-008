import type { AppEntry, MediaAction, ProcessEntry, WindowEntry } from '@shared/ipc';
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
  let nextPid = 9_800_000; // haqiqiy PID'lar bilan to'qnashmasligi uchun
  const launched: string[] = [];
  const mediaKeys: string[] = [];
  const MB = 1024 * 1024;
  // Oynasi yo'q fon jarayoni (FakeSync) faqat majburan yopiladi
  const processes: ProcessEntry[] = [
    { pid: 4, name: 'System', memoryBytes: 2 * MB, cpuPercent: 0.3, sessionId: 0, title: '' },
    { pid: 900, name: 'svchost', memoryBytes: 40 * MB, cpuPercent: 0.1, sessionId: 0, title: '' },
    { pid: 4242, name: 'explorer', memoryBytes: 120 * MB, cpuPercent: 0.5, sessionId: 1, title: 'Downloads' },
    {
      pid: 9_700_001,
      name: 'chrome',
      memoryBytes: 600 * MB,
      cpuPercent: 12.5,
      sessionId: 1,
      title: 'YouTube - Google Chrome',
    },
    { pid: 9_700_002, name: 'chrome', memoryBytes: 300 * MB, cpuPercent: 3, sessionId: 1, title: '' },
    { pid: 9_700_003, name: 'chrome', memoryBytes: 200 * MB, cpuPercent: 1, sessionId: 1, title: '' },
    {
      pid: 9_700_100,
      name: 'Telegram',
      memoryBytes: 250 * MB,
      cpuPercent: 0.4,
      sessionId: 1,
      title: 'Telegram',
    },
    { pid: 9_700_200, name: 'FakeSync', memoryBytes: 80 * MB, cpuPercent: 25, sessionId: 1, title: '' },
  ];

  return {
    kind: 'fake',
    supported: true,
    launched,
    mediaKeys,
    listApps: async () => apps,
    launchApp: async (app) => {
      launched.push(app.name);
      const process = app.name === 'Calculator' ? 'CalculatorApp' : app.name.split(' ')[0]!.toLowerCase();
      const pid = nextPid++;
      windows.push({ pid, app: process, title: app.name });
      processes.push({
        pid,
        name: process,
        memoryBytes: 50 * MB,
        cpuPercent: 0,
        sessionId: 1,
        title: app.name,
      });
    },
    listWindows: async () => windows.map((w) => ({ ...w })),
    focusWindow: async (pid) => windows.some((w) => w.pid === pid),
    battery: async () => ({ percent: 76, charging: false }),
    listProcesses: async () => processes.map((p) => ({ ...p })),
    closeProcesses: async (pids: number[], force: boolean) => {
      // Haqiqiy dasturlar kabi: bosh oyna yopilsa, uning yordamchi jarayonlari ham tugaydi.
      // Oynasi umuman yo'q dastur "X" so'roviga javob bermaydi, faqat majburan yopiladi.
      const hasWindow = pids.some((pid) => processes.find((p) => p.pid === pid)?.title);
      if (!force && !hasWindow) return;
      for (const pid of pids) {
        const i = processes.findIndex((p) => p.pid === pid);
        if (i === -1) continue;
        processes.splice(i, 1);
        const w = windows.findIndex((x) => x.pid === pid);
        if (w !== -1) windows.splice(w, 1);
      }
    },
    runningPids: async (pids: number[]) => pids.filter((pid) => processes.some((p) => p.pid === pid)),
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
    listProcesses: fail,
    closeProcesses: fail,
    runningPids: fail,
    sendMediaKey: fail,
  };
}
