import { copyFileSync, existsSync, renameSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import type { Database } from '../database/database';
import { MIGRATIONS } from '../database/migrations';

/**
 * Zaxira nusxa va tiklash (prompt §22, v2.1 §8).
 * - Zaxirada API kalitlari BO'LMAYDI (ular shu kompyuterga bog'langan, DPAPI). Tiklashda joriy kalitlar saqlab qolinadi.
 * - Tiklashdan oldin joriy baza avtomatik "before-restore" nusxaga olinadi.
 * - Tiklash ilova qayta ishga tushganda, baza ochilishidan oldin bajariladi.
 */

const sqlString = (p: string) => `'${p.replace(/'/g, "''")}'`;

export function backupTo(db: Database, target: string): { conversations: number; reminders: number } {
  if (existsSync(target)) rmSync(target);
  db.exec(`VACUUM INTO ${sqlString(target)}`);
  const copy = new DatabaseSync(target);
  try {
    copy.exec('DELETE FROM secrets; UPDATE provider_settings SET secret_ref = NULL;');
    copy.exec('VACUUM');
    return {
      conversations: (copy.prepare('SELECT COUNT(*) AS n FROM conversations').get() as { n: number }).n,
      reminders: (copy.prepare('SELECT COUNT(*) AS n FROM reminders').get() as { n: number }).n,
    };
  } finally {
    copy.close();
  }
}

/** Tanlangan fayl MARIUS zaxirasimi va bu versiya uni o'qiy oladimi */
export function validateBackup(file: string): { ok: true } | { ok: false; reason: string } {
  let db: DatabaseSync | null = null;
  try {
    db = new DatabaseSync(file, { readOnly: true });
    const tables = new Set(
      (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map(
        (r) => r.name,
      ),
    );
    for (const t of ['migrations', 'app_settings', 'conversations', 'messages'])
      if (!tables.has(t)) return { ok: false, reason: 'Bu fayl MARIUS zaxirasi emas.' };
    const max = (db.prepare('SELECT MAX(version) AS v FROM migrations').get() as { v: number | null }).v ?? 0;
    const known = Math.max(...MIGRATIONS.map((m) => m.version));
    if (max > known)
      return {
        ok: false,
        reason: 'Bu zaxira MARIUS’ning yangiroq versiyasida yaratilgan. Avval ilovani yangilang.',
      };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'Faylni ochib bo‘lmadi yoki u buzilgan.' };
  } finally {
    db?.close();
  }
}

export const pendingRestorePath = (dbFile: string) => `${dbFile}.restore`;

/** Tiklashni tayyorlash: joriy bazani nusxalab, tanlangan zaxirani keyingi ishga tushishga qo'yadi */
export function scheduleRestore(db: Database, dbFile: string, backupFile: string, now = new Date()): string {
  const check = validateBackup(backupFile);
  if (!check.ok) throw new Error(check.reason);
  const before = `${dbFile.replace(/\.db$/, '')}.before-restore-${now.toISOString().replace(/[:.]/g, '-')}.db`;
  db.exec(`VACUUM INTO ${sqlString(before)}`);
  copyFileSync(backupFile, pendingRestorePath(dbFile));
  return before;
}

/**
 * Ishga tushganda (baza ochilishidan oldin): kutilayotgan tiklash bo'lsa, bazani almashtiradi.
 * Joriy API kalitlari (shifrlangan) yangi bazaga ko'chiriladi.
 */
export function applyPendingRestore(dbFile: string): boolean {
  const pending = pendingRestorePath(dbFile);
  if (!existsSync(pending)) return false;
  if (!validateBackup(pending).ok) {
    rmSync(pending);
    return false;
  }
  let secrets: { name: string; ciphertext: string }[] = [];
  if (existsSync(dbFile)) {
    try {
      const old = new DatabaseSync(dbFile, { readOnly: true });
      secrets = old.prepare('SELECT name, ciphertext FROM secrets').all() as typeof secrets;
      old.close();
    } catch {
      secrets = [];
    }
  }
  for (const suffix of ['', '-wal', '-shm']) if (existsSync(dbFile + suffix)) rmSync(dbFile + suffix);
  renameSync(pending, dbFile);
  if (secrets.length) {
    const fresh = new DatabaseSync(dbFile);
    try {
      const ins = fresh.prepare('INSERT OR REPLACE INTO secrets (name, ciphertext) VALUES (?, ?)');
      for (const s of secrets) ins.run(s.name, s.ciphertext);
    } finally {
      fresh.close();
    }
  }
  return true;
}
