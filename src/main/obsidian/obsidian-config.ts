import type { Database } from '../database/database';

export interface ObsidianConfig {
  enabled: boolean;
  vaultPath: string | null;
  read: boolean;
  create: boolean;
  append: boolean;
}

export const DEFAULT_OBSIDIAN: ObsidianConfig = {
  enabled: false,
  vaultPath: null,
  read: false,
  create: false,
  append: false,
};

/**
 * Obsidian sozlamalari (v2.1 §4): hammasi standart holatda O'CHIQ. Vault yo'li faqat tizim dialogi orqali o'rnatiladi
 * (renderer o'zboshimchalik bilan yo'l bera olmaydi). Har bir ruxsat alohida.
 */
export class ObsidianConfigRepository {
  constructor(private readonly db: Database) {}

  get(): ObsidianConfig {
    const row = this.db.prepare("SELECT value FROM app_settings WHERE key = 'obsidian'").get() as
      { value: string } | undefined;
    if (!row) return { ...DEFAULT_OBSIDIAN };
    try {
      const v = JSON.parse(row.value) as Partial<ObsidianConfig>;
      return {
        enabled: v.enabled === true,
        vaultPath: typeof v.vaultPath === 'string' ? v.vaultPath : null,
        read: v.read === true,
        create: v.create === true,
        append: v.append === true,
      };
    } catch {
      return { ...DEFAULT_OBSIDIAN };
    }
  }

  set(patch: Partial<ObsidianConfig>): ObsidianConfig {
    const next = { ...this.get(), ...patch };
    this.db
      .prepare(
        `INSERT INTO app_settings (key, value) VALUES ('obsidian', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
      )
      .run(JSON.stringify(next));
    return next;
  }

  /** Vault uzilganda barcha ruxsatlar ham o'chadi (v2.1 §9 H) */
  disconnect(): ObsidianConfig {
    return this.set({ ...DEFAULT_OBSIDIAN });
  }
}
