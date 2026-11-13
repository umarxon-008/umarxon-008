import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, type Database } from '../../../src/main/database/database';

/** Vaqtinchalik haqiqiy SQLite baza (migratsiyalar bilan). */
export function tempDatabase(): { db: Database; file: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'marius-unit-'));
  const file = join(dir, 'marius.db');
  const db = openDatabase(file);
  return {
    db,
    file,
    cleanup: () => {
      try {
        db.close();
      } catch {
        /* yopilgan */
      }
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
