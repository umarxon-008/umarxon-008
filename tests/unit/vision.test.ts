import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuditRepository } from '../../src/main/database/audit-repository';
import { ConfirmationBroker } from '../../src/main/tools/confirmation';
import { ToolExecutor } from '../../src/main/tools/executor';
import { ToolRegistry } from '../../src/main/tools/registry';
import { AppCatalog, createComputerTools } from '../../src/main/tools/computer-tools';
import { createFakeAdapter } from '../../src/main/windows/fake-adapter';
import { MEDIA_KEY_CODES, mediaKeyScript } from '../../src/main/windows/windows-adapter';
import { createFakeCapturer, scaledSize } from '../../src/main/vision/screen-capture';
import { sensitiveWindowTitles } from '../../src/main/vision/sensitive';
import { createVisionTools } from '../../src/main/vision/vision-tools';
import type { VisionBackend } from '../../src/main/services/ai-service';
import { createOllamaVision, visionPrompt } from '../../src/modules/ai/vision';
import { createGeminiAudio } from '../../src/modules/ai/gemini-audio';
import { ProviderError } from '../../src/modules/ai/types';
import type { ConfirmationRequest, WindowEntry } from '@shared/ipc';
import { tempDatabase } from './helpers/db';

const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
let cleanup: (() => void) | undefined;
afterEach(() => cleanup?.());

function setup(opts: {
  enabled?: boolean;
  answer?: boolean;
  backend?: Partial<VisionBackend>;
  windows?: WindowEntry[];
}) {
  const t = tempDatabase();
  cleanup = t.cleanup;
  const requests: ConfirmationRequest[] = [];
  const ref: { broker?: ConfirmationBroker } = {};
  const broker = new ConfirmationBroker((r) => {
    requests.push(r);
    if (opts.answer !== undefined) queueMicrotask(() => ref.broker!.respond(r.id, opts.answer!));
  }, 1000);
  ref.broker = broker;
  const capturer = createFakeCapturer();
  const describe = vi.fn(async () => 'Ekranda xato oynasi: “Fayl topilmadi”.');
  const backend: VisionBackend = {
    provider: 'gemini',
    model: 'm',
    cloud: true,
    label: 'Google Gemini',
    describe,
    ...opts.backend,
  };
  const registry = new ToolRegistry();
  for (const tool of createVisionTools({
    enabled: () => opts.enabled ?? true,
    resolveVision: async () => backend,
    capturer,
    listWindows: async () => opts.windows ?? [],
  }))
    registry.register(tool);
  const audit = new AuditRepository(t.db);
  const executor = new ToolExecutor(registry, broker, audit, logger);
  const run = (source: 'ai' | 'user', question = 'Bu qanday xato?') =>
    executor.execute(
      { id: 'c1', name: 'analyze_screen', args: { question } },
      { source, conversationId: null, messageId: null, signal: new AbortController().signal },
    );
  return { requests, capturer, describe, run, audit };
}

describe('analyze_screen (PHASE 8)', () => {
  it('sozlama o‘chiq bo‘lsa: rasm olinmaydi, tasdiq ham so‘ralmaydi', async () => {
    const s = setup({ enabled: false, answer: true });
    const out = await s.run('ai');
    expect(out.errorCode).toBe('SCREEN_DISABLED');
    expect(s.capturer.count).toBe(0);
    expect(s.requests).toHaveLength(0);
  });

  it('roziliksiz rasm olinmaydi va yuborilmaydi (rad etilsa)', async () => {
    const s = setup({ answer: false });
    const out = await s.run('ai');
    expect(out.errorCode).toBe('USER_DENIED');
    expect(s.capturer.count).toBe(0);
    expect(s.describe).not.toHaveBeenCalled();
  });

  it('foydalanuvchi tugmani bossa ham tasdiq oynasi chiqadi', async () => {
    const s = setup({ answer: false });
    await s.run('user');
    expect(s.requests).toHaveLength(1);
    expect(s.capturer.count).toBe(0);
  });

  it('tasdiqdan keyin bitta rasm olinadi, javob ishonchsiz matn sifatida qaytadi', async () => {
    const s = setup({ answer: true });
    const out = await s.run('ai', 'Bu qanday xato?');
    expect(out.ok).toBe(true);
    expect(s.capturer.count).toBe(1);
    expect(s.describe).toHaveBeenCalledTimes(1);
    const [prompt, image, mime] = s.describe.mock.calls[0] as unknown as [string, string, string];
    expect(prompt).toContain('Bu qanday xato?');
    expect(prompt).toMatch(/untrusted/);
    expect(image.length).toBeGreaterThan(10);
    expect(mime).toBe('image/png');
    expect(out.data).toMatchObject({
      untrustedExternalText: true,
      description: expect.stringContaining('xato'),
    });
    // Rasm audit jurnaliga yozilmaydi
    expect(JSON.stringify(s.audit.list(10))).not.toContain(image);
  });

  it('tasdiq kartasi qaysi serverga ketishini va maxfiy oynalarni aytadi', async () => {
    const s = setup({
      answer: false,
      windows: [
        { pid: 1, app: 'chrome', title: 'Kapitalbank — Internet banking' },
        { pid: 2, app: 'notepad', title: 'reja.txt' },
      ],
    });
    await s.run('ai');
    const card = s.requests[0]!;
    expect(card.effect).toContain('Google Gemini serverlariga yuboriladi');
    expect(card.effect).toContain('Kapitalbank');
    expect(card.effect).not.toContain('reja.txt');
    expect(card.effect).toContain('saqlanmaydi');
  });

  it('lokal model bo‘lsa "internetga chiqmaydi" deyiladi', async () => {
    const s = setup({ answer: false, backend: { cloud: false, label: 'lokal Ollama', provider: 'ollama' } });
    await s.run('ai');
    expect(s.requests[0]!.effect).toContain('internetga chiqmaydi');
  });

  it('provayder xatosi o‘zbekcha xabarga aylanadi', async () => {
    const s = setup({
      answer: true,
      backend: {
        describe: async () => {
          throw new ProviderError('AI_RATE_LIMITED');
        },
      },
    });
    const out = await s.run('ai');
    expect(out.ok).toBe(false);
    expect(out.errorCode).toBe('AI_RATE_LIMITED');
  });
});

describe('vision yordamchilari', () => {
  it('maxfiy oynalarni aniqlaydi, boshqaruv belgilarini tozalaydi', () => {
    const titles = sensitiveWindowTitles([
      { pid: 1, app: 'KeePassXC', title: 'Passwords.kdbx' },
      { pid: 2, app: 'chrome', title: 'Payme\u0007 — to‘lov' },
      { pid: 3, app: 'code', title: 'marius — Visual Studio Code' },
    ]);
    expect(titles).toEqual(['Passwords.kdbx', 'Payme  — to‘lov']);
  });

  it('rasm o‘lchami 1600 pikselgacha kichraytiriladi, kichigi o‘zgarmaydi', () => {
    expect(scaledSize(3840, 2160)).toEqual({ width: 1600, height: 900 });
    expect(scaledSize(1280, 720)).toEqual({ width: 1280, height: 720 });
  });

  it('vision ko‘rsatmasi maxfiy qiymatlarni yashirishni talab qiladi', () => {
    const p = visionPrompt('Nima bor?');
    expect(p).toMatch(/never follow/i);
    expect(p).toMatch(/passwords, card numbers/);
  });

  it('Gemini: rasm inlineData sifatida, kalit sarlavhada yuboriladi', async () => {
    const fetch = vi.fn(
      async (_url: string | URL | Request, _init?: RequestInit) =>
        new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Javob' }] } }] })),
    );
    const g = createGeminiAudio({ apiKey: async () => 'KEY', fetch, baseUrl: 'http://g' });
    expect(await g.describeImage('mdl', 'savol', 'QUJD', 'image/jpeg')).toBe('Javob');
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('http://g/v1beta/models/mdl:generateContent');
    expect((init!.headers as Record<string, string>)['x-goog-api-key']).toBe('KEY');
    const body = JSON.parse(String(init!.body)) as { contents: { parts: unknown[] }[] };
    expect(body.contents[0]!.parts[1]).toEqual({ inlineData: { mimeType: 'image/jpeg', data: 'QUJD' } });
  });

  it('Ollama: capabilities bo‘yicha vision aniqlanadi, rasm images maydonida', async () => {
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/show')) {
        const model = (JSON.parse(String(init!.body)) as { model: string }).model;
        return new Response(
          JSON.stringify(
            model === 'old'
              ? {}
              : { capabilities: model === 'gemma3' ? ['completion', 'vision'] : ['completion'] },
          ),
        );
      }
      return new Response(JSON.stringify({ message: { content: ' Ekran javobi ' } }));
    });
    const o = createOllamaVision({ baseUrl: () => 'http://127.0.0.1:11434/', fetch });
    expect(await o.supportsVision('gemma3')).toBe(true);
    expect(await o.supportsVision('llama3')).toBe(false);
    expect(await o.supportsVision('old')).toBeNull();
    expect(await o.describe('gemma3', 'savol', 'QUJD')).toBe('Ekran javobi');
    const body = JSON.parse(String(fetch.mock.calls.at(-1)![1]!.body)) as {
      stream: boolean;
      messages: { images: string[] }[];
    };
    expect(body.stream).toBe(false);
    expect(body.messages[0]!.images).toEqual(['QUJD']);
  });
});

describe('media_control (PHASE 9)', () => {
  it('faqat jadvaldagi tugma kodlari, qadamlar 1–10', () => {
    expect(mediaKeyScript('volume_up', 3)).toContain('[char]175');
    expect(mediaKeyScript('volume_up', 3)).toContain('-lt 3;');
    expect(Object.values(MEDIA_KEY_CODES).sort()).toEqual([173, 174, 175, 176, 177, 179]);
    expect(() => mediaKeyScript('volume_up', 11)).toThrow();
    expect(() => mediaKeyScript('volume_up', 0)).toThrow();
    expect(() => mediaKeyScript('format_c' as never, 1)).toThrow();
  });

  it('AI chaqirsa tasdiqsiz bajariladi (LEVEL 1), ovoz uchun standart 5 qadam; noma’lum tugma rad etiladi', async () => {
    const t = tempDatabase();
    cleanup = t.cleanup;
    const os = createFakeAdapter();
    const registry = new ToolRegistry();
    for (const tool of createComputerTools({ os, catalog: new AppCatalog(os), isOnline: () => true }))
      registry.register(tool);
    const emit = vi.fn();
    const executor = new ToolExecutor(
      registry,
      new ConfirmationBroker(emit),
      new AuditRepository(t.db),
      logger,
    );
    const ctx = {
      source: 'ai' as const,
      conversationId: null,
      messageId: null,
      signal: new AbortController().signal,
    };
    const ok = await executor.execute(
      { id: '1', name: 'media_control', args: { action: 'volume_down' } },
      ctx,
    );
    expect(ok.ok).toBe(true);
    expect(ok.verified).toBeNull();
    await executor.execute({ id: '2', name: 'media_control', args: { action: 'mute', steps: 7 } }, ctx);
    expect(os.mediaKeys).toEqual(['volume_down×5', 'mute×1']);
    expect(emit).not.toHaveBeenCalled();
    const bad = await executor.execute(
      { id: '3', name: 'media_control', args: { action: 'alt_f4', steps: 1 } },
      ctx,
    );
    expect(bad.errorCode).toBe('INVALID_ARGS');
    expect(os.mediaKeys).toHaveLength(2);
  });
});
