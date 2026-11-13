export interface Migration {
  version: number;
  name: string;
  sql: string;
}

/**
 * Migratsiyalar faqat qo'shiladi, mavjudlari hech qachon o'zgartirilmaydi.
 * Har biri alohida tranzaksiyada bajariladi.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'app_settings',
    sql: `
      CREATE TABLE app_settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
    `,
  },
];
