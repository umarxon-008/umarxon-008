import { DatabaseSync } from 'node:sqlite';
import { MIGRATIONS, type Migration } from './migrations';

export type Database = DatabaseSync;

/**
 * SQLite bazasini ochadi. WAL rejimi crash bo'lganda ma'lumot buzilishidan himoya qiladi.
 * Node'ning ichki `node:sqlite` moduli ishlatiladi, native build kerak emas.
 */
export function openDatabase(file: string, migrations: Migration[] = MIGRATIONS): Database {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 3000;');
  runMigrations(db, migrations);
  return db;
}

export function runMigrations(db: Database, migrations: Migration[]): number[] {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);

  const applied = new Set(
    (db.prepare('SELECT version FROM migrations').all() as { version: number }[]).map((r) => r.version),
  );

  const sorted = [...migrations].sort((a, b) => a.version - b.version);
  const versions = sorted.map((m) => m.version);
  if (new Set(versions).size !== versions.length) {
    throw new Error('Migratsiya versiyalari takrorlangan');
  }

  const newlyApplied: number[] = [];
  for (const migration of sorted) {
    if (applied.has(migration.version)) continue;
    db.exec('BEGIN');
    try {
      db.exec(migration.sql);
      db.prepare('INSERT INTO migrations (version, name) VALUES (?, ?)').run(
        migration.version,
        migration.name,
      );
      db.exec('COMMIT');
      newlyApplied.push(migration.version);
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(`Migratsiya ${migration.version} (${migration.name}) bajarilmadi: ${String(error)}`, {
        cause: error,
      });
    }
  }
  return newlyApplied;
}
