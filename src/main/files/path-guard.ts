import { realpath } from 'node:fs/promises';
import path from 'node:path';

/**
 * Yo'l himoyasi (prompt §10.4): har bir fayl amali faqat foydalanuvchi ruxsat bergan papkalar ichida.
 * - realpath: symlink va Windows junction (reparse point) haqiqiy manzilga ochiladi, keyin tekshiriladi
 * - ".." orqali chiqish, nisbiy yo'l, qurilma (\\.\, \\?\) va tarmoq (\\server) yo'llari rad etiladi
 */

export type GuardResult = { ok: true; real: string; root: string } | { ok: false; reason: GuardReason };
export type GuardReason =
  'NOT_ABSOLUTE' | 'BAD_PATH' | 'OUTSIDE_ALLOWED' | 'NOT_FOUND' | 'NO_ALLOWED_FOLDERS';

const isWin = process.platform === 'win32';
const norm = (p: string) => (isWin ? p.toLowerCase() : p);

export function isInside(root: string, target: string): boolean {
  const rel = path.relative(norm(root), norm(target));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

export function isSuspiciousPath(p: string): boolean {
  return (
    p.includes('\0') ||
    /^\\\\/.test(p) || // UNC, \\?\, \\.\ (tarmoq va qurilma yo'llari)
    /^[a-z]:[^\\/]/i.test(p) || // "C:foo" (diskdagi joriy papkaga nisbiy)
    p.length > 1000
  );
}

async function realRoots(roots: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const r of roots) {
    try {
      out.push(await realpath(r));
    } catch {
      /* mavjud bo'lmagan ruxsatli papka e'tiborsiz */
    }
  }
  return out;
}

/** Mavjud fayl yoki papka ruxsatli ildiz ichidami (symlink'lar ochilgan holda) */
export async function guardExisting(target: string, roots: string[]): Promise<GuardResult> {
  if (roots.length === 0) return { ok: false, reason: 'NO_ALLOWED_FOLDERS' };
  if (isSuspiciousPath(target)) return { ok: false, reason: 'BAD_PATH' };
  if (!path.isAbsolute(target)) return { ok: false, reason: 'NOT_ABSOLUTE' };
  let real: string;
  try {
    real = await realpath(target);
  } catch {
    return { ok: false, reason: 'NOT_FOUND' };
  }
  const root = (await realRoots(roots)).find((r) => isInside(r, real));
  return root ? { ok: true, real, root } : { ok: false, reason: 'OUTSIDE_ALLOWED' };
}

/** Yangi yaratiladigan element: ota-papka mavjud va ruxsatli, nom xavfsiz bo'lishi kerak */
export async function guardNew(parent: string, name: string, roots: string[]): Promise<GuardResult> {
  if (validateFileName(name) !== null) return { ok: false, reason: 'BAD_PATH' };
  const p = await guardExisting(parent, roots);
  if (!p.ok) return p;
  return { ok: true, real: path.join(p.real, name), root: p.root };
}

const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

/** Windows uchun xavfsiz fayl nomi. Xato bo'lsa o'zbekcha sabab, aks holda null. */
export function validateFileName(name: string): string | null {
  if (!name || !name.trim()) return 'Nom bo‘sh bo‘lmasligi kerak.';
  if (name.length > 200) return 'Nom juda uzun.';
  if (name === '.' || name === '..') return 'Bunday nom ishlatib bo‘lmaydi.';
  // eslint-disable-next-line no-control-regex
  if (/[<>:"/\\|?*\x00-\x1f]/.test(name)) return 'Nomda < > : " / \\ | ? * belgilari bo‘lmasligi kerak.';
  if (/[. ]$/.test(name)) return 'Nom nuqta yoki bo‘sh joy bilan tugamasligi kerak.';
  if (RESERVED.test(name)) return 'Bu nom Windows’da band (CON, NUL, COM1 va h.k.).';
  return null;
}

/** Ishga tushiriladigan fayllar: AI yoki foydalanuvchi buyrug'i bilan "ochish" orqali bajarilmaydi */
const EXECUTABLE = new Set([
  'exe',
  'com',
  'bat',
  'cmd',
  'ps1',
  'psm1',
  'vbs',
  'vbe',
  'js',
  'jse',
  'wsf',
  'wsh',
  'msi',
  'msp',
  'scr',
  'lnk',
  'reg',
  'hta',
  'cpl',
  'jar',
  'msc',
  'dll',
  'sys',
  'pif',
  'url',
  'appref-ms',
  'application',
  'gadget',
  'inf',
]);

export function isExecutable(file: string): boolean {
  return EXECUTABLE.has(path.extname(file).slice(1).toLowerCase());
}

export const GUARD_MESSAGES: Record<GuardReason, string> = {
  NOT_ABSOLUTE: 'To‘liq yo‘l kerak (masalan, C:\\Users\\...).',
  BAD_PATH: 'Yo‘l yoki nom noto‘g‘ri yoki xavfli.',
  OUTSIDE_ALLOWED:
    'Bu joy ruxsat berilgan papkalardan tashqarida. Kompyuter → Fayllar bo‘limida papkaga ruxsat bering.',
  NOT_FOUND: 'Fayl yoki papka topilmadi.',
  NO_ALLOWED_FOLDERS: 'Hali birorta papkaga ruxsat berilmagan. Kompyuter → Fayllar bo‘limida papka qo‘shing.',
};
