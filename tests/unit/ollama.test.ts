import { describe, expect, it, vi } from 'vitest';
import { createOllamaProvider, isLocalUrl } from '../../src/modules/ai/ollama';
import { collect, streamOf } from './helpers/streams';

const req = { model: 'llama', system: 'SYS', messages: [{ role: 'user' as const, content: 'Salom' }] };

describe('Ollama adapter', () => {
  it('NDJSON oqimini o‘qiydi va tizim ko‘rsatmasini birinchi xabar qilib yuboradi', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          streamOf([
            '{"message":{"role":"assistant","content":"Assalomu"},"done":false}\n',
            '{"message":{"role":"assistant","content":" alaykum"},"done":false}\n{"message":{"content":""},"done":true}\n',
          ]),
        ),
    );
    const p = createOllamaProvider({
      baseUrl: () => 'http://127.0.0.1:11434/',
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect((await collect(p.streamChat(req, new AbortController().signal))).join('')).toBe(
      'Assalomu alaykum',
    );
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:11434/api/chat');
    const body = JSON.parse(String(init.body));
    expect(body.stream).toBe(true);
    expect(body.messages[0]).toEqual({ role: 'system', content: 'SYS' });
  });

  it('Ollama ishlamayotgan bo‘lsa → AI_UNAVAILABLE', async () => {
    const fetchMock = vi.fn(async () => {
      throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
    });
    const p = createOllamaProvider({
      baseUrl: () => 'http://127.0.0.1:11434',
      fetch: fetchMock as unknown as typeof fetch,
    });
    await expect(p.listModels()).rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
  });

  it('model topilmasa → AI_MODEL_NOT_FOUND', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ error: "model 'x' not found" }), { status: 404 }),
    );
    const p = createOllamaProvider({
      baseUrl: () => 'http://127.0.0.1:11434',
      fetch: fetchMock as unknown as typeof fetch,
    });
    await expect(collect(p.streamChat(req, new AbortController().signal))).rejects.toMatchObject({
      code: 'AI_MODEL_NOT_FOUND',
    });
  });

  it('modellar ro‘yxati', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ models: [{ name: 'a:latest' }, { name: 'b' }] })),
    );
    const p = createOllamaProvider({
      baseUrl: () => 'http://localhost:11434',
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(await p.listModels()).toEqual(['a:latest', 'b']);
  });

  it('lokal manzilni aniqlaydi (maxfiylik belgisi uchun)', () => {
    expect(isLocalUrl('http://127.0.0.1:11434')).toBe(true);
    expect(isLocalUrl('http://localhost:11434')).toBe(true);
    expect(isLocalUrl('http://192.168.1.5:11434')).toBe(false);
    expect(isLocalUrl('nonsense')).toBe(false);
  });
});
