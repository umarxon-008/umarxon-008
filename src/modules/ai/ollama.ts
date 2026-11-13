import {
  createStreamGuard,
  mapFetchError,
  ProviderError,
  type AIProvider,
  type ChatRequest,
  type FetchLike,
} from './types';
import { ndjsonLines } from './stream-parsers';

/**
 * Ollama (lokal AI) adapteri. API: https://github.com/ollama/ollama/blob/main/docs/api.md
 * - GET  /api/tags  — o'rnatilgan modellar
 * - POST /api/chat  — NDJSON oqim: { message: { content }, done }
 */

interface OllamaOptions {
  baseUrl: () => string;
  fetch?: FetchLike;
  /** Model birinchi marta xotiraga yuklanishi uzoq vaqt olishi mumkin */
  firstChunkTimeoutMs?: number;
  idleTimeoutMs?: number;
}

export function isLocalUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  } catch {
    return false;
  }
}

async function errorFromResponse(res: Response): Promise<ProviderError> {
  let message = '';
  try {
    message = ((await res.json()) as { error?: string }).error ?? '';
  } catch {
    /* JSON emas */
  }
  if (res.status === 404 || /not found/i.test(message))
    return new ProviderError('AI_MODEL_NOT_FOUND', message);
  if (res.status >= 500) return new ProviderError('AI_UNAVAILABLE', `${res.status} ${message}`);
  return new ProviderError('AI_BAD_RESPONSE', `${res.status} ${message}`);
}

export function createOllamaProvider(options: OllamaOptions): AIProvider {
  const doFetch = options.fetch ?? fetch;
  const url = (path: string) => `${options.baseUrl().replace(/\/+$/, '')}${path}`;

  return {
    id: 'ollama',
    getCapabilities: () => ({
      streaming: true,
      tools: true,
      vision: false,
      cloud: !isLocalUrl(options.baseUrl()),
    }),

    async listModels(signal) {
      let res: Response;
      try {
        res = await doFetch(url('/api/tags'), { signal: signal ?? AbortSignal.timeout(5_000) });
      } catch (error) {
        throw mapFetchError(error, signal, true);
      }
      if (!res.ok) throw await errorFromResponse(res);
      const body = (await res.json()) as { models?: { name?: string }[] };
      return (body.models ?? []).map((m) => m.name).filter((n): n is string => typeof n === 'string');
    },

    async *streamChat(request: ChatRequest, signal: AbortSignal) {
      const guard = createStreamGuard(
        signal,
        options.firstChunkTimeoutMs ?? 180_000,
        options.idleTimeoutMs ?? 60_000,
      );
      try {
        // So'rov boshlanishidan oldin to'xtatilgan bo'lsa, tarmoqqa umuman chiqilmaydi
        if (guard.signal.aborted) throw mapFetchError(null, guard.signal, true);
        let res: Response;
        try {
          res = await doFetch(url('/api/chat'), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              model: request.model,
              stream: true,
              messages: [{ role: 'system', content: request.system }, ...request.messages],
            }),
            signal: guard.signal,
          });
        } catch (error) {
          throw mapFetchError(error, guard.signal, true);
        }
        if (!res.ok) throw await errorFromResponse(res);
        if (!res.body) throw new ProviderError('AI_BAD_RESPONSE', 'empty body');

        let produced = false;
        try {
          for await (const line of ndjsonLines(res.body)) {
            guard.touch();
            let chunk: { message?: { content?: string }; done?: boolean; error?: string };
            try {
              chunk = JSON.parse(line);
            } catch {
              throw new ProviderError('AI_BAD_RESPONSE', 'invalid JSON line');
            }
            if (chunk.error) throw new ProviderError('AI_UNAVAILABLE', chunk.error);
            const text = chunk.message?.content ?? '';
            if (text) {
              produced = true;
              yield text;
            }
            if (chunk.done) break;
          }
        } catch (error) {
          throw mapFetchError(error, guard.signal, true);
        }
        if (!produced) throw new ProviderError('AI_BAD_RESPONSE', 'no text');
      } finally {
        guard.dispose();
      }
    },
  };
}
