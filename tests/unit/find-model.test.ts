import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiService } from '../../src/main/services/ai-service';
import {
  ProviderSettingsRepository,
  GEMINI_SECRET,
} from '../../src/main/database/provider-settings-repository';
import { SecretStore, type Encryptor } from '../../src/main/database/secret-store';
import { tempDatabase } from './helpers/db';

const enc: Encryptor = {
  isAvailable: async () => true,
  encrypt: async (s) => Buffer.from(s, 'utf8'),
  decrypt: async (b) => b.toString('utf8'),
};

let cleanup: (() => void) | undefined;
afterEach(() => cleanup?.());

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

async function setup(probe: Record<string, () => Response>, models: string[]) {
  const t = tempDatabase();
  cleanup = t.cleanup;
  const secrets = new SecretStore(t.db, enc);
  await secrets.set(GEMINI_SECRET, 'AQ.test-key');
  const repo = new ProviderSettingsRepository(t.db);
  const fetch = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes('/models?')) {
      return json(200, {
        models: models.map((m) => ({ name: `models/${m}`, supportedGenerationMethods: ['generateContent'] })),
      });
    }
    const model = /models\/([^:]+):generateContent/.exec(url)![1]!;
    return (probe[model] ?? (() => json(500, {})))();
  });
  const ai = new AiService(repo, secrets, {
    fetch: fetch as unknown as typeof globalThis.fetch,
    geminiBaseUrl: 'http://g',
  });
  return { ai, repo, fetch };
}

const limit0 = () =>
  json(429, {
    error: {
      code: 429,
      status: 'RESOURCE_EXHAUSTED',
      message:
        'Quota exceeded for metric: generate_content_free_tier_requests, limit: 0, model: gemini-2.5-pro',
    },
  });
const notFound = () =>
  json(404, { error: { code: 404, status: 'NOT_FOUND', message: 'models/x is not found' } });
const ok = () => json(200, { candidates: [{ content: { parts: [{ text: 'Salom' }] } }] });

describe('Ishlaydigan Gemini modelini topish', () => {
  it('404 va "bepul limiti 0" bo‘lganlarni o‘tkazib, birinchi ishlaganini tanlaydi', async () => {
    const { ai, repo } = await setup(
      { 'gemini-2.5-flash': limit0, 'gemini-2.5-flash-lite': notFound, 'gemini-2.0-flash': ok },
      [
        'gemini-3-pro-preview',
        'gemini-2.5-flash',
        'gemini-2.5-flash-preview-tts',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash',
      ],
    );
    const r = await ai.findGeminiModel();
    expect(r.model).toBe('gemini-2.0-flash');
    expect(r.tried).toEqual([
      { model: 'gemini-2.5-flash', ok: false, reason: 'bepul kalitda ishlamaydi' },
      { model: 'gemini-2.5-flash-lite', ok: false, reason: 'bu kalit uchun mavjud emas' },
      { model: 'gemini-2.0-flash', ok: true, reason: 'ishlaydi' },
    ]);
    expect(repo.get()).toMatchObject({ provider: 'gemini', geminiModel: 'gemini-2.0-flash' });
  });

  it('kalit noto‘g‘ri bo‘lsa darhol to‘xtaydi, ovoz modellari sinalmaydi', async () => {
    const bad = () =>
      json(400, { error: { status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] } });
    const { ai, fetch } = await setup({ 'gemini-2.5-flash': bad, 'gemini-2.0-flash': ok }, [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.5-flash-preview-tts',
    ]);
    const r = await ai.findGeminiModel();
    expect(r.model).toBeNull();
    expect(r.message).toMatch(/aistudio/);
    expect(fetch.mock.calls.map((c) => String(c[0])).some((u) => u.includes('tts'))).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2); // ro'yxat + bitta sinov
  });

  it('hamma joyda limit tugagan bo‘lsa, kutish kerakligini aytadi', async () => {
    const busy = () =>
      json(429, { error: { status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded, limit: 15' } });
    const { ai } = await setup({ 'gemini-2.5-flash': busy, 'gemini-2.0-flash': busy }, [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
    ]);
    const r = await ai.findGeminiModel();
    expect(r.model).toBeNull();
    expect(r.tried.map((t) => t.reason)).toEqual(['limit tugagan', 'limit tugagan']);
    expect(r.message).toMatch(/kutib/);
  });

  it('suhbatdagi 429 "limit: 0" va 404 uchun aniq maslahat', async () => {
    const { describeProviderError } = await import('../../src/main/services/ai-service');
    expect(
      describeProviderError('gemini', 'AI_RATE_LIMITED', '429 RESOURCE_EXHAUSTED — Quota exceeded, limit: 0'),
    ).toMatch(/bepul kalitda ishlamaydi.*Ishlaydigan modelni topish/);
    expect(
      describeProviderError('gemini', 'AI_MODEL_NOT_FOUND', '404 NOT_FOUND — models/x is not found'),
    ).toMatch(/mavjud emas yoki eskirgan/);
  });
});
