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
  {
    version: 2,
    name: 'ai_and_chat',
    sql: `
      -- Shifrlangan maxfiy qiymatlar (Windows: DPAPI). Ochiq matn hech qachon saqlanmaydi.
      CREATE TABLE secrets (
        name       TEXT PRIMARY KEY,
        ciphertext TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      -- Provayder sozlamalari. Kalitning o'zi emas, faqat secrets jadvalidagi nomga havola.
      CREATE TABLE provider_settings (
        provider   TEXT PRIMARY KEY,
        config     TEXT NOT NULL DEFAULT '{}',
        secret_ref TEXT REFERENCES secrets(name) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE conversations (
        id         TEXT PRIMARY KEY,
        title      TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);

      CREATE TABLE messages (
        id              TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content         TEXT NOT NULL,
        status          TEXT NOT NULL CHECK (status IN ('complete', 'streaming', 'cancelled', 'error')),
        provider        TEXT,
        model           TEXT,
        error_code      TEXT,
        created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
    `,
  },
];
