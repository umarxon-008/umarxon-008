import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@shared/ipc';
import { openDatabase, runMigrations, type Database } from '../../src/main/database/database';
import { MIGRATIONS } from '../../src/main/database/migrations';
import { SettingsRepository } from '../../src/main/database/settings-repository';

const dirs: string[] = [];
const dbs: Database[] = [];

function tempDb(): { db: Database; file: string } {
  const dir = mkdtempSync(join(tmpdir(), 'marius-test-'));
  dirs.push(dir);
  const file = join(dir, 'marius.db');
  const db = openDatabase(file);
  dbs.push(db);
  return { db, file };
}

afterEach(() => {
  for (const db of dbs.splice(0)) {
    try {
      db.close();
    } catch {
      /* allaqachon yopilgan */
    }
  }
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('migratsiyalar', () => {
  it('barcha migratsiyalarni bir marta qo‘llaydi', () => {
    const { db } = tempDb();
    const rows = db.prepare('SELECT version FROM migrations ORDER BY version').all() as { version: number }[];
    expect(rows.map((r) => r.version)).toEqual(MIGRATIONS.map((m) => m.version));
    expect(runMigrations(db, MIGRATIONS)).toEqual([]);
  });

  it('WAL rejimi yoqilgan', () => {
    const { db } = tempDb();
    const row = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
    expect(row.journal_mode).toBe('wal');
  });

  it('xato migratsiya to‘liq bekor qilinadi', () => {
    const { db } = tempDb();
    const bad = { version: 999, name: 'bad', sql: 'CREATE TABLE half_done (x); THIS IS NOT SQL;' };
    expect(() => runMigrations(db, [...MIGRATIONS, bad])).toThrow(/999/);
    const table = db.prepare("SELECT name FROM sqlite_master WHERE name = 'half_done'").get();
    expect(table).toBeUndefined();
    expect(db.prepare('SELECT 1 FROM migrations WHERE version = 999').get()).toBeUndefined();
  });

  it('takrorlangan versiyani rad etadi', () => {
    const { db } = tempDb();
    const dup = [MIGRATIONS[0]!, { ...MIGRATIONS[0]!, name: 'dup' }];
    expect(() => runMigrations(db, dup)).toThrow(/takrorlangan/);
  });
});

describe('SettingsRepository', () => {
  it('bo‘sh bazada default qiymatlarni qaytaradi', () => {
    const { db } = tempDb();
    expect(new SettingsRepository(db).getAll()).toEqual(DEFAULT_SETTINGS);
  });

  it('o‘zgarishni saqlaydi va qayta ochilganda o‘qiydi', () => {
    const { db, file } = tempDb();
    new SettingsRepository(db).update({ theme: 'light', onboardingCompleted: true });
    db.close();
    const reopened = openDatabase(file);
    dbs.push(reopened);
    expect(new SettingsRepository(reopened).getAll()).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'light',
      onboardingCompleted: true,
    });
  });

  it('buzilgan yoki yaroqsiz qiymatda faqat o‘sha maydon default bo‘ladi', () => {
    const { db } = tempDb();
    const repo = new SettingsRepository(db);
    repo.update({ reducedMotion: true });
    db.prepare("INSERT INTO app_settings (key, value) VALUES ('theme', '\"neon\"')").run();
    db.prepare("INSERT INTO app_settings (key, value) VALUES ('onboardingCompleted', '{not json')").run();
    expect(repo.getAll()).toEqual({ ...DEFAULT_SETTINGS, reducedMotion: true });
  });
});
