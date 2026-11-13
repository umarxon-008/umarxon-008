import type { AppEntry } from '@shared/ipc';

/**
 * Foydalanuvchi aytgan dastur nomini Start menyusidagi dasturga moslashtirish (sof funksiya).
 * Natija: bitta aniq moslik, bir nechta nomzod (foydalanuvchi tanlaydi) yoki topilmadi (prompt §2, §9).
 */

/** O'zbekcha va ruscha nomlar → Windows'dagi odatiy (inglizcha) nomlar */
const ALIASES: Record<string, string[]> = {
  kalkulyator: ['calculator', 'калькулятор'],
  калькулятор: ['calculator'],
  bloknot: ['notepad', 'блокнот'],
  блокнот: ['notepad'],
  brauzer: ['chrome', 'edge', 'firefox', 'opera', 'yandex'],
  xrom: ['chrome'],
  krom: ['chrome'],
  sozlamalar: ['settings', 'параметры'],
  fayllar: ['file explorer', 'проводник'],
  provodnik: ['file explorer', 'проводник'],
  telegram: ['telegram desktop', 'telegram'],
  vscode: ['visual studio code'],
  'vs code': ['visual studio code'],
  word: ['word'],
  excel: ['excel'],
  paint: ['paint'],
  rasm: ['paint'],
  kamera: ['camera', 'камера'],
  soat: ['clock', 'alarms & clock', 'часы'],
};

/** Kichik harf, apostroflar va o'zbekcha qo'shimchalar ("-ni", "'ni") olib tashlanadi */
export function normalizeAppQuery(q: string): string {
  return q
    .toLowerCase()
    .replace(/[ʻʼ‘’`´']/g, '')
    .replace(/\s+(dasturini|dasturi|ilovasini|ilovasi|brauzerini|brauzeri)$/u, '')
    .replace(/(ni|ga|da|dan)$/u, (m, _g, offset: number, str: string) =>
      str.length - m.length >= 4 ? '' : m,
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ʻʼ‘’`´']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export type AppMatch =
  | { kind: 'exact'; app: AppEntry }
  | { kind: 'ambiguous'; candidates: AppEntry[] }
  | { kind: 'not_found'; suggestions: AppEntry[] };

export function matchApp(query: string, apps: AppEntry[]): AppMatch {
  const q = normalizeAppQuery(query);
  if (!q) return { kind: 'not_found', suggestions: [] };
  const variants = [q, ...(ALIASES[q] ?? [])];

  const score = (app: AppEntry): number => {
    const name = norm(app.name);
    let best = 0;
    for (const v of variants) {
      if (name === v) best = Math.max(best, 3);
      else if (name.startsWith(`${v} `) || name.startsWith(v)) best = Math.max(best, 2);
      else if (v.split(' ').every((t) => name.includes(t))) best = Math.max(best, 1);
    }
    return best;
  };

  const scored = apps.map((app) => ({ app, s: score(app) })).filter((x) => x.s > 0);
  if (scored.length === 0) {
    const first = q.slice(0, 3);
    return { kind: 'not_found', suggestions: apps.filter((a) => norm(a.name).startsWith(first)).slice(0, 5) };
  }
  const top = Math.max(...scored.map((x) => x.s));
  const best = scored.filter((x) => x.s === top).map((x) => x.app);
  if (best.length === 1) return { kind: 'exact', app: best[0]! };
  // Bir xil nomli dublikatlar bo'lsa birinchisi
  if (top === 3 && new Set(best.map((a) => norm(a.name))).size === 1) return { kind: 'exact', app: best[0]! };
  return { kind: 'ambiguous', candidates: best.slice(0, 8) };
}

/** Ochilgan oyna dasturga mos keladimi (natijani tekshirish uchun, §6.5) */
export function windowMatchesApp(window: { app: string; title: string }, app: AppEntry): boolean {
  const tokens = norm(app.name)
    .split(' ')
    .filter((t) => t.length >= 3 && !['microsoft', 'google', 'desktop'].includes(t));
  const hay = `${norm(window.app)} ${norm(window.title)}`;
  return tokens.some((t) => hay.includes(t));
}
