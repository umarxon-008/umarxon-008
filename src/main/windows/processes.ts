import type { ProcessEntry, ProcessGroup } from '@shared/ipc';

/**
 * Jarayonlar ro'yxati va yopish xavfsizligi (Task Manager funksiyasi).
 * Tizim uchun muhim jarayonlar hech qachon yopilmaydi: ular yopilsa Windows ishdan chiqishi
 * yoki foydalanuvchi tizimdan chiqib ketishi mumkin.
 */
const PROTECTED_NAMES = new Set(
  [
    'system',
    'idle',
    'registry',
    'memory compression',
    'secure system',
    'smss',
    'csrss',
    'wininit',
    'winlogon',
    'services',
    'lsass',
    'lsaiso',
    'svchost',
    'dwm',
    'explorer',
    'fontdrvhost',
    'sihost',
    'ctfmon',
    'taskhostw',
    'runtimebroker',
    'spoolsv',
    'audiodg',
    'conhost',
    'dllhost',
    'searchhost',
    'searchindexer',
    'startmenuexperiencehost',
    'shellexperiencehost',
    'textinputhost',
    'lockapp',
    'logonui',
    'userinit',
    'wudfhost',
    'msmpeng',
    'nissrv',
    'mpdefendercoreservice',
    'securityhealthservice',
    'securityhealthsystray',
    'smartscreen',
    'applicationframehost',
    'systemsettings',
    'powershell',
    'pwsh',
  ].map((n) => n.toLowerCase()),
);

export function normalizeProcessName(name: string): string {
  return name
    .trim()
    .replace(/\.exe$/i, '')
    .toLowerCase();
}

/** Nom bo'yicha himoya: tizim jarayonlari, Windows xizmatlari (session 0) va MARIUS'ning o'zi */
export function isProtectedProcess(
  p: Pick<ProcessEntry, 'name' | 'sessionId' | 'pid'>,
  ownPids: Set<number>,
): boolean {
  if (p.sessionId === 0) return true;
  if (ownPids.has(p.pid)) return true;
  const n = normalizeProcessName(p.name);
  return PROTECTED_NAMES.has(n) || n === 'marius' || n === 'electron';
}

export function groupProcesses(
  list: ProcessEntry[],
  ownPids: Set<number>,
  sortBy: 'memory' | 'cpu' = 'memory',
): ProcessGroup[] {
  const map = new Map<string, ProcessGroup & { pids: number[] }>();
  for (const p of list) {
    const key = normalizeProcessName(p.name);
    if (!key) continue;
    const g = map.get(key) ?? {
      name: p.name.replace(/\.exe$/i, ''),
      count: 0,
      memoryBytes: 0,
      cpuPercent: null,
      title: null,
      hasWindow: false,
      protected: false,
      pids: [],
    };
    g.count++;
    g.pids.push(p.pid);
    g.memoryBytes += p.memoryBytes;
    if (p.cpuPercent !== null) g.cpuPercent = Math.round(((g.cpuPercent ?? 0) + p.cpuPercent) * 10) / 10;
    if (p.title && !g.title) {
      g.title = p.title.length > 80 ? `${p.title.slice(0, 79)}…` : p.title;
      g.hasWindow = true;
    }
    if (isProtectedProcess(p, ownPids)) g.protected = true;
    map.set(key, g);
  }
  const groups = [...map.values()].map(({ pids: _pids, ...g }) => g);
  return groups.sort((a, b) =>
    sortBy === 'cpu'
      ? (b.cpuPercent ?? -1) - (a.cpuPercent ?? -1) || b.memoryBytes - a.memoryBytes
      : b.memoryBytes - a.memoryBytes,
  );
}

export type ProcessMatch =
  | { kind: 'found'; name: string; pids: number[]; hasWindow: boolean }
  | { kind: 'protected'; name: string }
  | { kind: 'ambiguous'; candidates: string[] }
  | { kind: 'not_found' };

/**
 * Foydalanuvchi yoki AI bergan nomni jarayonga moslaydi: "chrome", "Chrome.exe", "Google Chrome" (oyna sarlavhasi).
 * Avval aniq nom, keyin nom yoki sarlavha ichida qidiriladi. Bir nechta mos kelsa, tanlash so'raladi.
 */
export function matchProcess(query: string, list: ProcessEntry[], ownPids: Set<number>): ProcessMatch {
  const q = normalizeProcessName(query);
  if (!q) return { kind: 'not_found' };
  const byName = new Map<string, ProcessEntry[]>();
  for (const p of list) {
    const k = normalizeProcessName(p.name);
    byName.set(k, [...(byName.get(k) ?? []), p]);
  }
  let key: string | undefined = byName.has(q) ? q : undefined;
  if (!key) {
    const words = q.split(/\s+/).filter((w) => w.length >= 3);
    const hits = [...byName.entries()]
      .filter(
        ([k, ps]) =>
          (q.length >= 3 && k.includes(q)) ||
          (q.length >= 3 && q.includes(k) && k.length >= 3) ||
          ps.some(
            (p) => p.title && words.length > 0 && words.every((w) => p.title.toLowerCase().includes(w)),
          ),
      )
      .map(([k]) => k);
    if (hits.length === 0) return { kind: 'not_found' };
    if (hits.length > 1) {
      return { kind: 'ambiguous', candidates: hits.map((k) => byName.get(k)![0]!.name).slice(0, 8) };
    }
    key = hits[0]!;
  }
  const ps = byName.get(key)!;
  const name = ps[0]!.name.replace(/\.exe$/i, '');
  if (ps.some((p) => isProtectedProcess(p, ownPids))) return { kind: 'protected', name };
  return { kind: 'found', name, pids: ps.map((p) => p.pid), hasWindow: ps.some((p) => Boolean(p.title)) };
}
