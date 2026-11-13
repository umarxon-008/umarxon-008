import { ProviderIdSchema, type ProviderId } from '@shared/ipc';
import type { Database } from './database';

export const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
export const GEMINI_SECRET = 'gemini.apiKey';

export interface StoredAiConfig {
  provider: ProviderId | null;
  geminiModel: string | null;
  ollamaBaseUrl: string;
  ollamaModel: string | null;
}

/**
 * Provayder sozlamalari `provider_settings` jadvalida.
 * Faol provayder `app` qatorida, har bir provayderning konfiguratsiyasi o'z qatorida.
 */
export class ProviderSettingsRepository {
  constructor(private readonly db: Database) {}

  private read(provider: string): Record<string, unknown> {
    const row = this.db.prepare('SELECT config FROM provider_settings WHERE provider = ?').get(provider) as
      { config: string } | undefined;
    if (!row) return {};
    try {
      const parsed: unknown = JSON.parse(row.config);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  private write(provider: string, config: Record<string, unknown>, secretRef?: string | null): void {
    this.db
      .prepare(
        `INSERT INTO provider_settings (provider, config, secret_ref) VALUES (?, ?, ?)
         ON CONFLICT(provider) DO UPDATE SET config = excluded.config,
           secret_ref = COALESCE(excluded.secret_ref, provider_settings.secret_ref),
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
      )
      .run(provider, JSON.stringify(config), secretRef ?? null);
  }

  get(): StoredAiConfig {
    const app = this.read('app');
    const gemini = this.read('gemini');
    const ollama = this.read('ollama');
    const provider = ProviderIdSchema.safeParse(app['provider']);
    return {
      provider: provider.success ? provider.data : null,
      geminiModel: typeof gemini['model'] === 'string' ? gemini['model'] : null,
      ollamaBaseUrl: typeof ollama['baseUrl'] === 'string' ? ollama['baseUrl'] : DEFAULT_OLLAMA_URL,
      ollamaModel: typeof ollama['model'] === 'string' ? ollama['model'] : null,
    };
  }

  update(patch: Partial<StoredAiConfig>): StoredAiConfig {
    const current = this.get();
    const next = { ...current, ...patch };
    this.db.exec('BEGIN');
    try {
      this.write('app', { provider: next.provider });
      this.write('gemini', { model: next.geminiModel });
      this.write('ollama', { baseUrl: next.ollamaBaseUrl, model: next.ollamaModel });
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return next;
  }

  setSecretRef(provider: ProviderId, secretRef: string | null): void {
    this.write(provider, this.read(provider));
    this.db
      .prepare('UPDATE provider_settings SET secret_ref = ? WHERE provider = ?')
      .run(secretRef, provider);
  }
}
