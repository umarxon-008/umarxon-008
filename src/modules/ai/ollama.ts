import { randomUUID } from 'node:crypto';
import {
  createStreamGuard,
  mapFetchError,
  ProviderError,
  type AIProvider,
  type ChatRequest,
  type ChatTurn,
  type FetchLike,
  type ToolCallRequest,
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
  // Ba'zi lokal modellar function calling'ni qo'llamaydi: chat servisi vositalarsiz qayta uradi
  if (/does not support tools/i.test(message)) return new ProviderError('AI_TOOLS_UNSUPPORTED', message);
  if (res.status === 404 || /not found/i.test(message))
    return new ProviderError('AI_MODEL_NOT_FOUND', message);
  if (res.status >= 500) return new ProviderError('AI_UNAVAILABLE', `${res.status} ${message}`);
  return new ProviderError('AI_BAD_RESPONSE', `${res.status} ${message}`);
}

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: { function: { name: string; arguments: Record<string, unknown> } }[];
  tool_name?: string;
}

/** Suhbatni Ollama formatiga o'tkazadi (docs/api.md: tool_calls va role "tool" + tool_name). */
export function toOllamaMessages(system: string, messages: ChatTurn[]): OllamaMessage[] {
  const out: OllamaMessage[] = [{ role: 'system', content: system }];
  for (const m of messages) {
    if (m.role === 'user') out.push({ role: 'user', content: m.content });
    else if (m.role === 'assistant') {
      out.push({
        role: 'assistant',
        content: m.content,
        ...(m.toolCalls?.length
          ? { tool_calls: m.toolCalls.map((c) => ({ function: { name: c.name, arguments: c.args } })) }
          : {}),
      });
    } else {
      out.push({ role: 'tool', content: JSON.stringify(m.result), tool_name: m.name });
    }
  }
  return out;
}

function parseArgs(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      const v: unknown = JSON.parse(raw);
      if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
    } catch {
      /* noto'g'ri JSON: bo'sh argumentlar, tool validatsiyasi rad etadi */
    }
  }
  return {};
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
              messages: toOllamaMessages(request.system, request.messages),
              ...(request.tools?.length
                ? {
                    tools: request.tools.map((t) => ({
                      type: 'function',
                      function: { name: t.name, description: t.description, parameters: t.parameters },
                    })),
                  }
                : {}),
            }),
            signal: guard.signal,
          });
        } catch (error) {
          throw mapFetchError(error, guard.signal, true);
        }
        if (!res.ok) throw await errorFromResponse(res);
        if (!res.body) throw new ProviderError('AI_BAD_RESPONSE', 'empty body');

        let produced = false;
        const calls: ToolCallRequest[] = [];
        try {
          for await (const line of ndjsonLines(res.body)) {
            guard.touch();
            let chunk: {
              message?: {
                content?: string;
                tool_calls?: { function?: { name?: string; arguments?: unknown } }[];
              };
              done?: boolean;
              error?: string;
            };
            try {
              chunk = JSON.parse(line);
            } catch {
              throw new ProviderError('AI_BAD_RESPONSE', 'invalid JSON line');
            }
            if (chunk.error) {
              if (/does not support tools/i.test(chunk.error))
                throw new ProviderError('AI_TOOLS_UNSUPPORTED', chunk.error);
              throw new ProviderError('AI_UNAVAILABLE', chunk.error);
            }
            for (const tc of chunk.message?.tool_calls ?? []) {
              if (tc.function?.name) {
                calls.push({
                  id: randomUUID(),
                  name: tc.function.name,
                  args: parseArgs(tc.function.arguments),
                });
              }
            }
            const text = chunk.message?.content ?? '';
            if (text) {
              produced = true;
              yield { type: 'text' as const, text };
            }
            if (chunk.done) break;
          }
        } catch (error) {
          throw mapFetchError(error, guard.signal, true);
        }
        if (calls.length > 0) {
          yield { type: 'tool_calls' as const, calls };
          return;
        }
        if (!produced) throw new ProviderError('AI_BAD_RESPONSE', 'no text');
      } finally {
        guard.dispose();
      }
    },
  };
}
