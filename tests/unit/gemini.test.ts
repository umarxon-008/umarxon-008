import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGeminiProvider, setGeminiRetryDelays } from '../../src/modules/ai/gemini';
import { ProviderError } from '../../src/modules/ai/types';
import { collect, streamOf } from './helpers/streams';

const textOf = (events: { type: string; text?: string }[]) =>
  events.map((e) => (e.type === 'text' ? e.text : '')).join('');

const KEY = 'AIza-test-key-123456';

// Qayta urinish pauzalari testlarda kutilmaydi
beforeEach(() => setGeminiRetryDelays([0, 0]));
const req = { model: 'test-model', system: 'SYS', messages: [{ role: 'user' as const, content: 'Salom' }] };

function sse(...objs: unknown[]) {
  return streamOf(objs.map((o) => `data: ${JSON.stringify(o)}\r\n\r\n`));
}

describe('Gemini adapter', () => {
  it('to‘g‘ri endpoint, header va body bilan so‘rov yuboradi va matnni oqim bilan qaytaradi', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          sse(
            { candidates: [{ content: { parts: [{ text: 'Salom' }] } }] },
            { candidates: [{ content: { parts: [{ text: ', do‘stim!' }] }, finishReason: 'STOP' }] },
          ),
        ),
    );
    const p = createGeminiProvider({ apiKey: async () => KEY, fetch: fetchMock as unknown as typeof fetch });
    const chunks = await collect(p.streamChat(req, new AbortController().signal));
    expect(textOf(chunks)).toBe('Salom, do‘stim!');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/test-model:streamGenerateContent?alt=sse',
    );
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(KEY);
    expect(url).not.toContain(KEY); // kalit URL'da emas
    const body = JSON.parse(String(init.body));
    expect(body.systemInstruction.parts[0].text).toBe('SYS');
    expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'Salom' }] }]);
  });

  it('assistant rolini "model" ga aylantiradi', async () => {
    const fetchMock = vi.fn(
      async () => new Response(sse({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] })),
    );
    const p = createGeminiProvider({ apiKey: async () => KEY, fetch: fetchMock as unknown as typeof fetch });
    await collect(
      p.streamChat(
        {
          ...req,
          messages: [
            { role: 'user', content: 'a' },
            { role: 'assistant', content: 'b' },
            { role: 'user', content: 'c' },
          ],
        },
        new AbortController().signal,
      ),
    );
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.contents.map((c: { role: string }) => c.role)).toEqual(['user', 'model', 'user']);
  });

  it.each([
    [
      400,
      { error: { code: 400, status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] } },
      'AI_AUTH_INVALID',
    ],
    [403, { error: { code: 403, status: 'PERMISSION_DENIED' } }, 'AI_AUTH_INVALID'],
    [429, { error: { code: 429, status: 'RESOURCE_EXHAUSTED' } }, 'AI_RATE_LIMITED'],
    [404, { error: { code: 404, status: 'NOT_FOUND' } }, 'AI_MODEL_NOT_FOUND'],
    [503, { error: { code: 503, status: 'UNAVAILABLE' } }, 'AI_UNAVAILABLE'],
  ])('HTTP %i xatosini to‘g‘ri kodga aylantiradi', async (status, body, code) => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
    const p = createGeminiProvider({ apiKey: async () => KEY, fetch: fetchMock as unknown as typeof fetch });
    await expect(collect(p.streamChat(req, new AbortController().signal))).rejects.toMatchObject({ code });
  });

  it('kalit bo‘lmasa so‘rov yubormaydi', async () => {
    const fetchMock = vi.fn();
    const p = createGeminiProvider({ apiKey: async () => null, fetch: fetchMock as unknown as typeof fetch });
    await expect(collect(p.streamChat(req, new AbortController().signal))).rejects.toMatchObject({
      code: 'AI_NOT_CONFIGURED',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('xavfsizlik bloki → AI_BLOCKED', async () => {
    const fetchMock = vi.fn(async () => new Response(sse({ promptFeedback: { blockReason: 'SAFETY' } })));
    const p = createGeminiProvider({ apiKey: async () => KEY, fetch: fetchMock as unknown as typeof fetch });
    await expect(collect(p.streamChat(req, new AbortController().signal))).rejects.toMatchObject({
      code: 'AI_BLOCKED',
    });
  });

  it('tarmoq xatosi → AI_NETWORK', async () => {
    const fetchMock = vi.fn(async () => {
      throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } });
    });
    const p = createGeminiProvider({ apiKey: async () => KEY, fetch: fetchMock as unknown as typeof fetch });
    await expect(collect(p.streamChat(req, new AbortController().signal))).rejects.toMatchObject({
      code: 'AI_NETWORK',
    });
  });

  it('foydalanuvchi to‘xtatsa → CANCELLED', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn(
      async (_u: string, init: RequestInit) =>
        new Promise<Response>((_res, rej) => {
          init.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
        }),
    );
    const p = createGeminiProvider({ apiKey: async () => KEY, fetch: fetchMock as unknown as typeof fetch });
    const pending = collect(p.streamChat(req, controller.signal));
    controller.abort(new ProviderError('CANCELLED'));
    await expect(pending).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  it('javob boshlanmasa timeout → AI_TIMEOUT', async () => {
    const fetchMock = vi.fn(
      async (_u: string, init: RequestInit) =>
        new Promise<Response>((_res, rej) => {
          init.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
        }),
    );
    const p = createGeminiProvider({
      apiKey: async () => KEY,
      fetch: fetchMock as unknown as typeof fetch,
      firstChunkTimeoutMs: 30,
    });
    await expect(collect(p.streamChat(req, new AbortController().signal))).rejects.toMatchObject({
      code: 'AI_TIMEOUT',
    });
  });

  it('modellar ro‘yxati: faqat generateContent qo‘llaydiganlar, sahifalash bilan', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            models: [
              { name: 'models/a', supportedGenerationMethods: ['generateContent', 'countTokens'] },
              { name: 'models/embed', supportedGenerationMethods: ['embedContent'] },
            ],
            nextPageToken: 'p2',
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ models: [{ name: 'models/b', supportedGenerationMethods: ['generateContent'] }] }),
        ),
      );
    const p = createGeminiProvider({ apiKey: async () => KEY, fetch: fetchMock as unknown as typeof fetch });
    expect(await p.listModels()).toEqual(['a', 'b']);
    expect(String(fetchMock.mock.calls[1]![0])).toContain('pageToken=p2');
  });
});

describe('Gemini ulanish xatolari: aniq maslahat', () => {
  it('Google sababi bo‘yicha o‘zbekcha maslahat beriladi', async () => {
    const { geminiHint } = await import('../../src/main/services/ai-service');
    expect(geminiHint('400 INVALID_ARGUMENT API_KEY_INVALID — API key not valid.')).toMatch(/aistudio/);
    expect(
      geminiHint(
        '403 PERMISSION_DENIED SERVICE_DISABLED — Generative Language API has not been used in project 1',
      ),
    ).toMatch(/Vertex AI/);
    expect(geminiHint('400 FAILED_PRECONDITION — User location is not supported for the API use.')).toMatch(
      /hududingizda/,
    );
    expect(geminiHint('429 RESOURCE_EXHAUSTED')).toBeNull();
  });

  it('xato tafsilotida Google xabari bor, kalitning o‘zi yo‘q', async () => {
    const { createGeminiProvider } = await import('../../src/modules/ai/gemini');
    const key = 'AQ.SECRET-KEY-VALUE-123';
    const provider = createGeminiProvider({
      apiKey: async () => key,
      fetch: async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 403,
              status: 'PERMISSION_DENIED',
              message: 'Method doesn’t allow unregistered callers.',
            },
          }),
          { status: 403 },
        ),
    });
    const err = await provider.listModels().catch((e: unknown) => e);
    expect(String((err as { detail?: string }).detail)).toContain('unregistered callers');
    expect(String((err as { detail?: string }).detail)).not.toContain(key);
  });
});

describe('Gemini: vaqtinchalik server xatosi (503 "model band")', () => {
  const overloaded = () =>
    new Response(
      JSON.stringify({
        error: {
          code: 503,
          status: 'UNAVAILABLE',
          message: 'The model is overloaded. Please try again later.',
        },
      }),
      { status: 503 },
    );

  it('ikki marta 503 bo‘lsa ham qayta urinib, javobni qaytaradi', async () => {
    const { setGeminiRetryDelays } = await import('../../src/modules/ai/gemini');
    setGeminiRetryDelays([0, 0]);
    let n = 0;
    const fetchMock = vi.fn(async () =>
      ++n <= 2
        ? overloaded()
        : new Response(sse({ candidates: [{ content: { parts: [{ text: 'Salom!' }] } }] })),
    );
    const p = createGeminiProvider({ apiKey: async () => KEY, fetch: fetchMock as unknown as typeof fetch });
    expect(textOf(await collect(p.streamChat(req, new AbortController().signal)))).toBe('Salom!');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('uch marta 503: AI_UNAVAILABLE va Google sababi; 429 qayta urinilmaydi', async () => {
    const { setGeminiRetryDelays } = await import('../../src/modules/ai/gemini');
    setGeminiRetryDelays([0, 0]);
    const always503 = vi.fn(async () => overloaded());
    const p = createGeminiProvider({ apiKey: async () => KEY, fetch: always503 as unknown as typeof fetch });
    const err = (await collect(p.streamChat(req, new AbortController().signal)).catch(
      (e: unknown) => e,
    )) as ProviderError;
    expect(err.code).toBe('AI_UNAVAILABLE');
    expect(err.detail).toContain('overloaded');
    expect(always503).toHaveBeenCalledTimes(3);

    const limit = vi.fn(
      async () => new Response(JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED' } }), { status: 429 }),
    );
    const p2 = createGeminiProvider({ apiKey: async () => KEY, fetch: limit as unknown as typeof fetch });
    const err2 = (await collect(p2.streamChat(req, new AbortController().signal)).catch(
      (e: unknown) => e,
    )) as ProviderError;
    expect(err2.code).toBe('AI_RATE_LIMITED');
    expect(limit).toHaveBeenCalledTimes(1);
  });

  it('suhbatdagi xabar xizmatni aniq aytadi: Gemini band yoki Ollama ishlamayapti', async () => {
    const { describeProviderError } = await import('../../src/main/services/ai-service');
    const g = describeProviderError('gemini', 'AI_UNAVAILABLE', '503 UNAVAILABLE — The model is overloaded.');
    expect(g).toMatch(/Google Gemini serveri hozir javob bermayapti yoki band/);
    expect(g).toContain('Google javobi: 503 UNAVAILABLE');
    expect(describeProviderError('ollama', 'AI_UNAVAILABLE', 'ECONNREFUSED')).toMatch(
      /Ollama’ga ulanib bo‘lmadi/,
    );
    expect(describeProviderError('gemini', 'AI_RATE_LIMITED')).toMatch(/limit/);
  });
});
