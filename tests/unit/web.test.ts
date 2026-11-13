import { describe, expect, it, vi } from 'vitest';
import { createYoutubeClient, decodeEntities } from '../../src/modules/ai/youtube';
import { createWebTools, safeHttpsUrl, searchUrl, youtubeSearchUrl } from '../../src/main/web/web-tools';
import type { ToolManifest } from '../../src/main/tools/types';

const KEY = 'AIza-youtube-key-123';

describe('YouTube Data API', () => {
  it('to‘g‘ri endpoint, kalit header’da, natijalar haqiqiy javobdan', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            items: [
              {
                id: { videoId: 'abc123' },
                snippet: {
                  title: 'C++ for sikli &#39;o‘zbek tilida&#39;',
                  channelTitle: 'IT &amp; Dars',
                  publishedAt: '2025-03-01T10:00:00Z',
                },
              },
              { id: { channelId: 'kanal' }, snippet: { title: 'Kanal' } },
            ],
          }),
        ),
    );
    const yt = createYoutubeClient({ apiKey: async () => KEY, fetch: fetchMock as unknown as typeof fetch });
    const videos = await yt.search('C++ for loop o‘zbek tilida', 5);
    expect(videos).toEqual([
      {
        title: "C++ for sikli 'o‘zbek tilida'",
        channel: 'IT & Dars',
        url: 'https://www.youtube.com/watch?v=abc123',
        publishedAt: '2025-03-01',
        description: '',
      },
    ]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.origin + url.pathname).toBe('https://youtube.googleapis.com/youtube/v3/search');
    expect(url.searchParams.get('part')).toBe('snippet');
    expect(url.searchParams.get('type')).toBe('video');
    expect(url.searchParams.get('q')).toBe('C++ for loop o‘zbek tilida');
    expect(url.searchParams.has('key')).toBe(false);
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(KEY);
  });

  it('limit va noto‘g‘ri kalit xatolari', async () => {
    const mk = (status: number, reason: string) =>
      createYoutubeClient({
        apiKey: async () => KEY,
        fetch: (async () =>
          new Response(JSON.stringify({ error: { code: status, errors: [{ reason }] } }), {
            status,
          })) as unknown as typeof fetch,
      });
    await expect(mk(403, 'quotaExceeded').search('x')).rejects.toMatchObject({ code: 'AI_RATE_LIMITED' });
    await expect(mk(400, 'keyInvalid').search('x')).rejects.toMatchObject({ code: 'AI_AUTH_INVALID' });
  });

  it('HTML entity’lar', () => {
    expect(decodeEntities('&quot;Salom&quot; &lt;3 &#x27;a&#x27; &amp;')).toBe('"Salom" <3 \'a\' &');
  });
});

describe('veb vositalari', () => {
  it('qidiruv havolalari kodlanadi', () => {
    expect(searchUrl('google', 'sun’iy intellekt & AI')).toBe(
      `https://www.google.com/search?q=${encodeURIComponent('sun’iy intellekt & AI')}`,
    );
    expect(youtubeSearchUrl('C++ for')).toBe('https://www.youtube.com/results?search_query=C%2B%2B%20for');
  });

  it('faqat https havola ochiladi', () => {
    expect(safeHttpsUrl('https://www.youtube.com/watch?v=1')).not.toBeNull();
    for (const bad of [
      'http://a.uz',
      'javascript:alert(1)',
      'file:///C:/Windows',
      'data:text/html,x',
      'https://user:pw@a.uz',
      'https://localhost',
      'nonsense',
    ]) {
      expect(safeHttpsUrl(bad), bad).toBeNull();
    }
  });

  it('kalit bo‘lmasa youtube_search brauzer variantini taklif qiladi, so‘rov yuborilmaydi', async () => {
    const search = vi.fn();
    const tools = createWebTools({
      engine: () => 'google',
      openExternal: vi.fn(),
      youtube: { search },
      hasYoutubeKey: () => false,
    });
    const yt = tools.find((t) => t.id === 'youtube_search') as ToolManifest<{ query: string }>;
    const p = await yt.prepare({ query: 'x' });
    expect(p).toMatchObject({ kind: 'done', output: { ok: false, errorCode: 'YOUTUBE_KEY_MISSING' } });
    expect(search).not.toHaveBeenCalled();
  });

  it('open_url: tasdiqdan oldin hech narsa ochilmaydi, noto‘g‘ri sxema rad etiladi', async () => {
    const openExternal = vi.fn(async () => undefined);
    const tools = createWebTools({
      engine: () => 'google',
      openExternal,
      youtube: { search: vi.fn() },
      hasYoutubeKey: () => true,
    });
    const open = tools.find((t) => t.id === 'open_url') as ToolManifest<{ url: string }>;
    expect(open.permissionLevel).toBe(2);
    expect(open.confirmation).toBe('always');
    expect(await open.prepare({ url: 'javascript:alert(1)' })).toMatchObject({
      kind: 'done',
      output: { errorCode: 'BAD_URL' },
    });
    const p = await open.prepare({ url: 'https://www.youtube.com/watch?v=abc' });
    expect(p.kind).toBe('action');
    expect(openExternal).not.toHaveBeenCalled();
    if (p.kind === 'action') await p.run(new AbortController().signal);
    expect(openExternal).toHaveBeenCalledWith('https://www.youtube.com/watch?v=abc');
  });
});
