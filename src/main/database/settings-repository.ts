import { DEFAULT_SETTINGS, SettingsSchema, type Settings, type SettingsPatch } from '@shared/ipc';
import type { Database } from './database';

/**
 * Sozlamalar `app_settings` jadvalida key → JSON qiymat ko'rinishida saqlanadi.
 * Buzilgan yoki eskirgan qiymat topilsa, default qiymat ishlatiladi.
 */
export class SettingsRepository {
  constructor(private readonly db: Database) {}

  getAll(): Settings {
    const rows = this.db.prepare('SELECT key, value FROM app_settings').all() as {
      key: string;
      value: string;
    }[];
    const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      if (!(row.key in DEFAULT_SETTINGS)) continue;
      try {
        merged[row.key] = JSON.parse(row.value);
      } catch {
        // buzilgan qiymat: default qoladi
      }
    }
    const parsed = SettingsSchema.safeParse(merged);
    if (parsed.success) return parsed.data;

    // Har bir maydonni alohida tekshiramiz: yaroqsiz bitta qiymat butun sozlamani buzmasin.
    const safe: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
      const field = SettingsSchema.shape[key].safeParse(merged[key]);
      if (field.success) safe[key] = field.data;
    }
    return SettingsSchema.parse(safe);
  }

  update(patch: SettingsPatch): Settings {
    const upsert = this.db.prepare(`
      INSERT INTO app_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    `);
    this.db.exec('BEGIN');
    try {
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) continue;
        upsert.run(key, JSON.stringify(value));
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return this.getAll();
  }
}
