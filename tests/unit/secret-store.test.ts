import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { SecretStore, type Encryptor } from '../../src/main/database/secret-store';
import { tempDatabase } from './helpers/db';

/** Soxta shifrlash: baytlarni XOR qiladi (testda DPAPI o'rnida). */
const fakeEncryptor = (available = true): Encryptor => ({
  isAvailable: async () => available,
  encrypt: async (s) => Buffer.from([...Buffer.from(s, 'utf8')].map((b) => b ^ 0x5a)),
  decrypt: async (b) => Buffer.from([...b].map((x) => x ^ 0x5a)).toString('utf8'),
});

let cleanup: (() => void) | undefined;
afterEach(() => cleanup?.());

describe('SecretStore', () => {
  it('kalitni shifrlab saqlaydi: DB faylida ochiq matn yo‘q', async () => {
    const t = tempDatabase();
    cleanup = t.cleanup;
    const store = new SecretStore(t.db, fakeEncryptor());
    await store.set('gemini.apiKey', 'AIza-SUPER-SECRET-123');
    expect(store.has('gemini.apiKey')).toBe(true);
    expect(await store.get('gemini.apiKey')).toBe('AIza-SUPER-SECRET-123');
    t.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    expect(readFileSync(t.file).includes(Buffer.from('AIza-SUPER-SECRET-123'))).toBe(false);
  });

  it('shifrlash mavjud bo‘lmasa saqlamaydi (ochiq matnga fallback yo‘q)', async () => {
    const t = tempDatabase();
    cleanup = t.cleanup;
    const store = new SecretStore(t.db, fakeEncryptor(false));
    await expect(store.set('k', 'v')).rejects.toMatchObject({ code: 'SECRET_STORAGE_UNAVAILABLE' });
    expect(store.has('k')).toBe(false);
  });

  it('o‘chirish', async () => {
    const t = tempDatabase();
    cleanup = t.cleanup;
    const store = new SecretStore(t.db, fakeEncryptor());
    await store.set('k', 'v');
    store.delete('k');
    expect(store.has('k')).toBe(false);
    expect(await store.get('k')).toBeNull();
  });
});
