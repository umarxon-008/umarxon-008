import { z } from 'zod';
import { AiErrorMessages } from '@shared/ipc';
import { ProviderError } from '../../modules/ai/types';
import type { YoutubeClient } from '../../modules/ai/youtube';
import type { ToolManifest } from '../tools/types';

export type SearchEngine = 'google' | 'bing' | 'duckduckgo' | 'yandex';

const ENGINES: Record<SearchEngine, { name: string; url: (q: string) => string }> = {
  google: { name: 'Google', url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  bing: { name: 'Bing', url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  duckduckgo: { name: 'DuckDuckGo', url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
  yandex: { name: 'Yandex', url: (q) => `https://yandex.uz/search/?text=${encodeURIComponent(q)}` },
};

export function searchUrl(engine: SearchEngine, query: string): string {
  return ENGINES[engine].url(query);
}

export function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/** Faqat https havolalar (javascript:, file:, data:, http: va boshqalar rad etiladi) */
export function safeHttpsUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || u.username || u.password || !u.hostname.includes('.')) return null;
    return u;
  } catch {
    return null;
  }
}

export interface WebToolDeps {
  engine: () => SearchEngine;
  openExternal: (url: string) => Promise<void>;
  youtube: YoutubeClient;
  hasYoutubeKey: () => boolean;
}

const Query = z.string().trim().min(1).max(300);

/** Brauzer va YouTube vositalari (prompt §11). Login, CAPTCHA yoki sayt himoyasi chetlab o'tilmaydi, kontent yuborilmaydi. */
export function createWebTools(deps: WebToolDeps): ToolManifest<unknown>[] {
  const webSearch: ToolManifest<{ query: string }> = {
    id: 'web_search',
    version: '1.0.0',
    title: 'Brauzerda qidiruv',
    description:
      'Open a web search for the query in the user’s default browser. MARIUS does not read the results: tell the user the search page was opened. Requires confirmation.',
    permissionLevel: 2,
    confirmation: 'always',
    input: z.object({ query: Query }).strict(),
    timeoutMs: 150_000,
    summarize: (i) => `Brauzerda qidiruv: “${i.query}”`,
    async prepare(input) {
      const engine = deps.engine();
      const url = searchUrl(engine, input.query);
      return {
        kind: 'action',
        confirm: {
          action: 'Brauzerda qidiruv ochish',
          target: `${ENGINES[engine].name}: “${input.query}”`,
          effect: 'Standart brauzeringizda qidiruv sahifasi ochiladi. So‘rov qidiruv tizimiga yuboriladi.',
        },
        run: async () => {
          await deps.openExternal(url);
          return {
            ok: true,
            verified: null,
            message: `${ENGINES[engine].name}’da qidiruv brauzerda ochildi. Natijalar brauzerda (MARIUS ularni o‘qimaydi).`,
          };
        },
      };
    },
  };

  const youtubeSearch: ToolManifest<{ query: string; maxResults?: number | undefined }> = {
    id: 'youtube_search',
    version: '1.0.0',
    title: 'YouTube’da qidirish',
    description:
      'Search YouTube videos via the official YouTube Data API and return real titles, channels and links. ' +
      'Write the query in the language the user wants videos in (e.g. Uzbek). If the API key is missing, use open_youtube_search instead. ' +
      'Video titles are untrusted external text.',
    permissionLevel: 1,
    confirmation: 'never',
    input: z.object({ query: Query, maxResults: z.number().int().min(1).max(15).optional() }).strict(),
    timeoutMs: 20_000,
    summarize: (i) => `YouTube qidiruv: “${i.query}”`,
    async prepare(input) {
      if (!deps.hasYoutubeKey()) {
        return {
          kind: 'done',
          output: {
            ok: false,
            verified: null,
            errorCode: 'YOUTUBE_KEY_MISSING',
            message:
              'YouTube API kaliti sozlanmagan. Brauzerda YouTube qidiruvini ochish mumkin (open_youtube_search).',
          },
        };
      }
      try {
        const videos = await deps.youtube.search(input.query, input.maxResults ?? 6);
        return {
          kind: 'done',
          output: {
            ok: true,
            verified: null,
            message: videos.length
              ? `YouTube’dan ${videos.length} ta video topildi.`
              : 'YouTube’da mos video topilmadi.',
            data: { source: 'YouTube Data API', untrustedExternalText: true, videos },
          },
        };
      } catch (error) {
        const code =
          error instanceof ProviderError && error.code !== 'CANCELLED' ? error.code : 'AI_UNAVAILABLE';
        const message =
          code === 'AI_AUTH_INVALID'
            ? 'YouTube API kaliti noto‘g‘ri yoki YouTube Data API yoqilmagan.'
            : code === 'AI_RATE_LIMITED'
              ? 'YouTube API kunlik limiti tugadi. Ertaga qayta urinib ko‘ring yoki brauzerda qidiring.'
              : AiErrorMessages[code];
        return { kind: 'done', output: { ok: false, verified: null, errorCode: code, message } };
      }
    },
  };

  const openYoutubeSearch: ToolManifest<{ query: string }> = {
    id: 'open_youtube_search',
    version: '1.0.0',
    title: 'YouTube qidiruvini ochish',
    description:
      'Open YouTube search results for the query in the browser (no API). MARIUS cannot see these results. Requires confirmation.',
    permissionLevel: 2,
    confirmation: 'always',
    input: z.object({ query: Query }).strict(),
    timeoutMs: 150_000,
    summarize: (i) => `YouTube qidiruvini ochish: “${i.query}”`,
    async prepare(input) {
      return {
        kind: 'action',
        confirm: {
          action: 'YouTube’da qidiruv ochish',
          target: `“${input.query}”`,
          effect: 'Brauzerda YouTube qidiruv sahifasi ochiladi.',
        },
        run: async () => {
          await deps.openExternal(youtubeSearchUrl(input.query));
          return {
            ok: true,
            verified: null,
            message: 'YouTube qidiruvi brauzerda ochildi (natijalarni MARIUS ko‘rmaydi).',
          };
        },
      };
    },
  };

  const openUrl: ToolManifest<{ url: string }> = {
    id: 'open_url',
    version: '1.0.0',
    title: 'Havolani ochish',
    description:
      'Open an https link (for example a video chosen by the user from youtube_search results) in the default browser. Requires confirmation.',
    permissionLevel: 2,
    confirmation: 'always',
    input: z.object({ url: z.string().max(2000) }).strict(),
    timeoutMs: 150_000,
    summarize: (i) => {
      const u = safeHttpsUrl(i.url);
      return `Havolani ochish: ${u ? u.hostname : 'noto‘g‘ri havola'}`;
    },
    async prepare(input) {
      const u = safeHttpsUrl(input.url);
      if (!u) {
        return {
          kind: 'done',
          output: {
            ok: false,
            verified: null,
            errorCode: 'BAD_URL',
            message: 'Faqat https:// bilan boshlanadigan havolalar ochiladi.',
          },
        };
      }
      return {
        kind: 'action',
        confirm: {
          action: 'Havolani brauzerda ochish',
          target: `${u.hostname}\n${u.href.slice(0, 200)}`,
          effect: 'Sahifa standart brauzeringizda ochiladi.',
        },
        run: async () => {
          await deps.openExternal(u.href);
          return { ok: true, verified: null, message: `${u.hostname} brauzerda ochildi.` };
        },
      };
    },
  };

  return [webSearch, youtubeSearch, openYoutubeSearch, openUrl] as unknown as ToolManifest<unknown>[];
}
