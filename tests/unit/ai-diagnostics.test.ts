import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiService } from '../../src/main/services/ai-service';
import { runAiDiagnostics } from '../../src/main/services/ai-diagnostics';
import {
  GEMINI_SECRET,
  ProviderSettingsRepository,
} from '../../src/main/database/provider-settings-repository';
import { SecretStore, type Encryptor } from '../../src/main/database/secret-store';
import { setGeminiRetryDelays } from '../../src/modules/ai/gemini';
import { streamOf } from './helpers/streams';
import { tempDatabase } from './helpers/db';

const enc: Encryptor = {
  isAvailable: async () => true,
  encrypt: async (s) => Buffer.from(s, 'utf8'),
  decrypt: async (b) => b.toString('utf8'),
};
const KEY = 'AQ.Ab8-very-secret-key-value';
let cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((c) => c());
  cleanups = [];
});

async function setup(opts: { stream: 'ok' | 'hang' | '400' }) {
  setGeminiRetryDelays([0, 0]);
  const t = tempDatabase();
  const dir = mkdtempSync(join(tmpdir(), 'marius-diag-'));
  cleanups.push(t.cleanup, () => rmSync(dir, { recursive: true, force: true }));
  const logFile = join(dir, 'marius.log');
  writeFileSync(
    logFile,
    `${JSON.stringify({ level: 'warn', event: 'chat.error', data: { code: 'AI_TIMEOUT' } })}\n{"event":"app.start"}\n`,
  );
  const secrets = new SecretStore(t.db, enc);
  await secrets.set(GEMINI_SECRET, KEY);
  const repo = new ProviderSettingsRepository(t.db);
  repo.update({ provider: 'gemini', geminiModel: 'gemini-2.5-flash' });
  const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const hasKey = (init?.headers as Record<string, string> | undefined)?.['x-goog-api-key'] === KEY;
    if (url.includes('/models?') && !hasKey) return new Response('{}', { status: 403 });
    if (url.includes('/models?')) {
      return new Response(
        JSON.stringify({
          models: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'].map((m) => ({
            name: `models/${m}`,
            supportedGenerationMethods: ['generateContent'],
          })),
        }),
      );
    }
    if (url.includes('gemini-2.0-flash:generateContent')) {
      return new Response(
        JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'limit: 0' } }),
        {
          status: 429,
        },
      );
    }
    if (url.includes(':generateContent'))
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Hi' }] } }] }));
    if (url.includes(':streamGenerateContent')) {
      if (opts.stream === '400') {
        return new Response(
          JSON.stringify({
            error: { code: 400, status: 'INVALID_ARGUMENT', message: 'Invalid function declaration' },
          }),
          {
            status: 400,
          },
        );
      }
      if (opts.stream === 'hang') {
        return new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener('abort', () => reject(init.signal!.reason as Error)),
        );
      }
      return new Response(
        streamOf([
          `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Salom!' }] } }] })}\r\n\r\n`,
        ]),
      );
    }
    return new Response('{}', { status: 404 });
  });
  const ai = new AiService(repo, secrets, {
    fetch: fetch as unknown as typeof globalThis.fetch,
    geminiBaseUrl: 'http://g',
  });
  const run = () =>
    runAiDiagnostics({
      ai,
      appVersion: '0.9.0',
      osName: 'Windows 11',
      geminiBaseUrl: 'http://g',
      logFile,
      resolveProxy: async () => 'DIRECT',
      tools: () => [{ name: 'launch_app', description: 'd', parameters: { type: 'object', properties: {} } }],
      fetch: fetch as unknown as typeof globalThis.fetch,
    });
  return { run };
}

describe('AI diagnostikasi', () => {
  it('hamma bosqich: tarmoq, kalit turi, modellar, sinov, oqim, log; kalitning o‘zi yo‘q', async () => {
    const report = await (await setup({ stream: 'ok' })).run();
    expect(report).toContain('Gemini kaliti: saqlangan (turi: AQ.…, uzunligi: 28)');
    expect(report).toContain('Tizim proxy (Windows): DIRECT');
    expect(report).toMatch(/Google serveriga ulanish: OK \(HTTP 403/);
    expect(report).toContain('Kalit qabul qilindi: 3 ta model');
    expect(report).toMatch(/✓ gemini-2\.5-flash: ishlaydi/);
    expect(report).toMatch(/✗ gemini-2\.0-flash: AI_RATE_LIMITED \(429 RESOURCE_EXHAUSTED — limit: 0\)/);
    expect(report).toMatch(/✓ gemini-2\.5-flash \(vositalarsiz\): birinchi bo‘lak \d+ ms/);
    expect(report).toMatch(/✓ gemini-2\.5-flash \+ 1 ta vosita/);
    expect(report).toContain('"chat.error"');
    expect(report).not.toContain(KEY);
    expect(report).not.toContain('very-secret');
  });

  it('vositalar bilan so‘rov rad etilsa, Google sababi ko‘rinadi', async () => {
    const report = await (await setup({ stream: '400' })).run();
    expect(report).toMatch(
      /✗ gemini-2\.5-flash \+ 1 ta vosita: AI_BAD_RESPONSE \(400 INVALID_ARGUMENT — Invalid function declaration\)/,
    );
  });
});
