import { mapFetchError, ProviderError, type FetchLike } from './types';

/**
 * YouTube Data API v3 qidiruvi. Endpoint va maydonlar Google'ning rasmiy `@googleapis/youtube` paketidan
 * tasdiqlangan: GET https://youtube.googleapis.com/youtube/v3/search (part, q, type, maxResults, relevanceLanguage),
 * natija items[].id.videoId va snippet.{title, channelTitle, publishedAt, description}.
 * Natijalar faqat haqiqiy API javobidan olinadi: soxta video, kanal yoki ko'rishlar soni yaratilmaydi (§11).
 */
export const YOUTUBE_DEFAULT_BASE_URL = 'https://youtube.googleapis.com';

export interface YoutubeVideo {
  title: string;
  channel: string;
  url: string;
  publishedAt: string;
  description: string;
}

/** API sarlavhalarni HTML-entity ko'rinishida qaytaradi (&#39;, &amp; ...) */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export function createYoutubeClient(options: {
  apiKey: () => Promise<string | null>;
  fetch?: FetchLike;
  baseUrl?: string;
}) {
  const doFetch = options.fetch ?? fetch;
  const base = (options.baseUrl ?? YOUTUBE_DEFAULT_BASE_URL).replace(/\/+$/, '');

  return {
    async search(query: string, maxResults = 8, signal?: AbortSignal): Promise<YoutubeVideo[]> {
      const key = await options.apiKey();
      if (!key) throw new ProviderError('AI_NOT_CONFIGURED', 'youtube key');
      const url = new URL(`${base}/youtube/v3/search`);
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('type', 'video');
      url.searchParams.set('q', query);
      url.searchParams.set('maxResults', String(Math.min(Math.max(maxResults, 1), 15)));
      url.searchParams.set('relevanceLanguage', 'uz');
      url.searchParams.set('safeSearch', 'moderate');
      const s = signal ?? AbortSignal.timeout(15_000);
      let res: Response;
      try {
        // Kalit URL'da emas, header'da (loglarga tushmasligi uchun)
        res = await doFetch(url, { headers: { 'x-goog-api-key': key }, signal: s });
      } catch (error) {
        throw mapFetchError(error, s, false);
      }
      const body = (await res.json().catch(() => ({}))) as {
        items?: {
          id?: { videoId?: string };
          snippet?: { title?: string; channelTitle?: string; publishedAt?: string; description?: string };
        }[];
        error?: { code?: number; errors?: { reason?: string }[] };
      };
      if (!res.ok) {
        const reason = body.error?.errors?.[0]?.reason ?? '';
        if (/quota|rateLimit/i.test(reason)) throw new ProviderError('AI_RATE_LIMITED', reason);
        if (res.status === 400 || res.status === 401 || res.status === 403)
          throw new ProviderError('AI_AUTH_INVALID', reason);
        throw new ProviderError('AI_UNAVAILABLE', `${res.status} ${reason}`);
      }
      return (body.items ?? [])
        .filter((i) => i.id?.videoId && i.snippet?.title)
        .map((i) => ({
          title: decodeEntities(i.snippet!.title!),
          channel: decodeEntities(i.snippet!.channelTitle ?? ''),
          url: `https://www.youtube.com/watch?v=${encodeURIComponent(i.id!.videoId!)}`,
          publishedAt: (i.snippet!.publishedAt ?? '').slice(0, 10),
          description: decodeEntities(i.snippet!.description ?? '').slice(0, 200),
        }));
    },
  };
}

export type YoutubeClient = ReturnType<typeof createYoutubeClient>;
