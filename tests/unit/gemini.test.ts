import { describe, expect, it, vi } from 'vitest';
import { createGeminiProvider } from '../../src/modules/ai/gemini';
import { ProviderError } from '../../src/modules/ai/types';
import { collect, streamOf } from './helpers/streams';

const KEY = 'AIza-test-key-123456';
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
    expect(chunks.join('')).toBe('Salom, do‘stim!');

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
