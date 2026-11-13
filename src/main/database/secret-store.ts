import type { Database } from './database';
import { AppError } from '../ipc/router';

/** OS darajasidagi shifrlash (Windows: DPAPI orqali Electron safeStorage). Testlarda soxta implementatsiya beriladi. */
export interface Encryptor {
  isAvailable(): Promise<boolean>;
  encrypt(plainText: string): Promise<Buffer>;
  decrypt(cipher: Buffer): Promise<string>;
}

/**
 * Maxfiy qiymatlar ombori. Qiymat faqat shifrlangan holda SQLite'ga yoziladi.
 * Shifrlash mavjud bo'lmasa, qiymat SAQLANMAYDI (ochiq matnga "fallback" yo'q).
 * Ochilgan qiymat faqat main process ichida ishlatiladi va renderer'ga hech qachon yuborilmaydi.
 */
export class SecretStore {
  constructor(
    private readonly db: Database,
    private readonly encryptor: Encryptor,
  ) {}

  isAvailable(): Promise<boolean> {
    return this.encryptor.isAvailable();
  }

  async set(name: string, value: string): Promise<void> {
    if (!(await this.encryptor.isAvailable())) throw new AppError('SECRET_STORAGE_UNAVAILABLE');
    const cipher = (await this.encryptor.encrypt(value)).toString('base64');
    this.db
      .prepare(
        `INSERT INTO secrets (name, ciphertext) VALUES (?, ?)
         ON CONFLICT(name) DO UPDATE SET ciphertext = excluded.ciphertext,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
      )
      .run(name, cipher);
  }

  has(name: string): boolean {
    return this.db.prepare('SELECT 1 FROM secrets WHERE name = ?').get(name) !== undefined;
  }

  async get(name: string): Promise<string | null> {
    const row = this.db.prepare('SELECT ciphertext FROM secrets WHERE name = ?').get(name) as
      { ciphertext: string } | undefined;
    if (!row) return null;
    if (!(await this.encryptor.isAvailable())) throw new AppError('SECRET_STORAGE_UNAVAILABLE');
    return this.encryptor.decrypt(Buffer.from(row.ciphertext, 'base64'));
  }

  delete(name: string): void {
    this.db.prepare('DELETE FROM secrets WHERE name = ?').run(name);
  }
}
