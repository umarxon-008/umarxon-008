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
import { sseData } from './stream-parsers';

/**
 * Google Gemini (Generative Language API, v1beta) adapteri.
 * Endpoint, header va maydon nomlari Google'ning rasmiy `@google/genai` SDK manba kodidan tasdiqlangan
 * (docs/PHASE_2_REPORT.md). Model nomlari kodga yozilmaydi: `listModels()` orqali API'dan olinadi.
 */
export const GEMINI_DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';
const API_VERSION = 'v1beta';

interface GeminiPart {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: { id?: string; name?: string; args?: Record<string, unknown> };
  functionResponse?: { id?: string; name: string; response: Record<string, unknown> };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

/**
 * Suhbatni Gemini formatiga o'tkazadi.
 * - assistant → role "model": asl qismlar (raw) bo'lsa o'shalar, aks holda matn + functionCall
 * - tool natijalari → role "user", functionResponse qismlari (ketma-ketlari bitta turnga birlashtiriladi)
 */
export function toGeminiContents(messages: ChatTurn[]): GeminiContent[] {
  const out: GeminiContent[] = [];
  for (const m of messages) {
    if (m.role === 'user') {
      out.push({ role: 'user', parts: [{ text: m.content }] });
    } else if (m.role === 'assistant') {
      const raw = Array.isArray(m.raw) ? (m.raw as GeminiPart[]) : null;
      const parts: GeminiPart[] = raw ?? [
        ...(m.content ? [{ text: m.content }] : []),
        ...(m.toolCalls ?? []).map((c) => ({
          functionCall: { ...(c.providerId ? { id: c.providerId } : {}), name: c.name, args: c.args },
        })),
      ];
      if (parts.length) out.push({ role: 'model', parts });
    } else {
      const response =
        m.result && typeof m.result === 'object' && !Array.isArray(m.result)
          ? (m.result as Record<string, unknown>)
          : { result: m.result };
      const part: GeminiPart = {
        functionResponse: { ...(m.providerId ? { id: m.providerId } : {}), name: m.name, response },
      };
      const last = out.at(-1);
      if (last?.role === 'user' && last.parts.every((p) => p.functionResponse)) last.parts.push(part);
      else out.push({ role: 'user', parts: [part] });
    }
  }
  return out;
}

interface GeminiOptions {
  apiKey: () => Promise<string | null>;
  fetch?: FetchLike;
  baseUrl?: string;
  firstChunkTimeoutMs?: number;
  idleTimeoutMs?: number;
}

interface GeminiErrorBody {
  error?: { code?: number; message?: string; status?: string; details?: { reason?: string }[] };
}

async function errorFromResponse(res: Response): Promise<ProviderError> {
  let body: GeminiErrorBody = {};
  try {
    body = (await res.json()) as GeminiErrorBody;
  } catch {
    /* JSON emas */
  }
  const status = body.error?.status ?? '';
  const reason = body.error?.details?.find((d) => d.reason)?.reason ?? '';
  // Google xabari (kalitning o'zini o'z ichiga olmaydi): tashxis uchun foydalanuvchiga ko'rsatiladi
  const googleMessage = (body.error?.message ?? '').replace(/\s+/g, ' ').slice(0, 200);
  const head = [res.status, status, reason].filter(Boolean).join(' ');
  const detail = googleMessage ? `${head} — ${googleMessage}` : head;
  if (
    res.status === 401 ||
    res.status === 403 ||
    reason === 'API_KEY_INVALID' ||
    status === 'UNAUTHENTICATED'
  ) {
    return new ProviderError('AI_AUTH_INVALID', detail);
  }
  if (res.status === 429 || status === 'RESOURCE_EXHAUSTED')
    return new ProviderError('AI_RATE_LIMITED', detail);
  if (res.status === 404) return new ProviderError('AI_MODEL_NOT_FOUND', detail);
  if (res.status >= 500) return new ProviderError('AI_UNAVAILABLE', detail);
  return new ProviderError('AI_BAD_RESPONSE', detail);
}

/** Vaqtinchalik server xatosida qayta urinish oralig'i (test uchun o'zgartirilishi mumkin) */
export let RETRY_DELAYS_MS = [1500, 4000];
export function setGeminiRetryDelays(delays: number[]): void {
  RETRY_DELAYS_MS = delays;
}

function waitOrAbort(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });
}

export function createGeminiProvider(options: GeminiOptions): AIProvider {
  const doFetch = options.fetch ?? fetch;
  const base = (options.baseUrl ?? GEMINI_DEFAULT_BASE_URL).replace(/\/+$/, '');

  const requireKey = async (): Promise<string> => {
    const key = await options.apiKey();
    if (!key) throw new ProviderError('AI_NOT_CONFIGURED');
    return key;
  };

  return {
    id: 'gemini',
    getCapabilities: () => ({ streaming: true, tools: true, vision: true, cloud: true }),

    async listModels(signal) {
      const key = await requireKey();
      const models: string[] = [];
      let pageToken: string | undefined;
      for (let page = 0; page < 10; page++) {
        const url = new URL(`${base}/${API_VERSION}/models`);
        url.searchParams.set('pageSize', '100');
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        let res: Response;
        try {
          res = await doFetch(url, {
            headers: { 'x-goog-api-key': key },
            signal: signal ?? AbortSignal.timeout(15_000),
          });
        } catch (error) {
          throw mapFetchError(error, signal, false);
        }
        if (!res.ok) throw await errorFromResponse(res);
        const body = (await res.json()) as {
          models?: { name?: string; supportedGenerationMethods?: string[] }[];
          nextPageToken?: string;
        };
        for (const m of body.models ?? []) {
          if (m.name && m.supportedGenerationMethods?.includes('generateContent')) {
            models.push(m.name.replace(/^models\//, ''));
          }
        }
        pageToken = body.nextPageToken;
        if (!pageToken) break;
      }
      return models;
    },

    async *streamChat(request: ChatRequest, signal: AbortSignal) {
      const key = await requireKey();
      const guard = createStreamGuard(
        signal,
        // Yangi Gemini modellari javobdan oldin "o'ylaydi" (thinking): bu vaqtda oqimda hech narsa kelmaydi.
        // Pro modellarda bu bir daqiqadan oshishi mumkin, shuning uchun kutish uzoqroq. Foydalanuvchi istalgan payt to'xtata oladi.
        options.firstChunkTimeoutMs ?? 120_000,
        options.idleTimeoutMs ?? 120_000,
      );
      try {
        const url = `${base}/${API_VERSION}/models/${encodeURIComponent(request.model)}:streamGenerateContent?alt=sse`;
        // So'rov boshlanishidan oldin to'xtatilgan bo'lsa, tarmoqqa umuman chiqilmaydi
        if (guard.signal.aborted) throw mapFetchError(null, guard.signal, false);
        const body = JSON.stringify({
          systemInstruction: { parts: [{ text: request.system }] },
          contents: toGeminiContents(request.messages),
          ...(request.tools?.length
            ? {
                tools: [
                  {
                    functionDeclarations: request.tools.map((t) => ({
                      name: t.name,
                      description: t.description,
                      parametersJsonSchema: t.parameters,
                    })),
                  },
                ],
              }
            : {}),
          generationConfig: { temperature: 0.7 },
        });
        // Google tavsiyasi: 500/503 ("model band") vaqtinchalik, kutib qayta urinish kerak.
        // Javob boshlanmasdan oldin 2 marta qayta uriniladi (1.5 s, 4 s). 429 (limit) qayta urinilmaydi.
        let res: Response | undefined;
        for (let attempt = 0; ; attempt++) {
          try {
            res = await doFetch(url, {
              method: 'POST',
              headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
              body,
              signal: guard.signal,
            });
          } catch (error) {
            throw mapFetchError(error, guard.signal, false);
          }
          if (res.ok || ![500, 502, 503, 504].includes(res.status) || attempt >= RETRY_DELAYS_MS.length)
            break;
          await res.body?.cancel().catch(() => undefined);
          await waitOrAbort(RETRY_DELAYS_MS[attempt]!, guard.signal);
          if (guard.signal.aborted) throw mapFetchError(null, guard.signal, false);
        }
        if (!res.ok) throw await errorFromResponse(res);
        if (!res.body) throw new ProviderError('AI_BAD_RESPONSE', 'empty body');

        let produced = false;
        const modelParts: GeminiPart[] = [];
        const calls: ToolCallRequest[] = [];
        try {
          for await (const data of sseData(res.body)) {
            guard.touch();
            let chunk: {
              candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
              promptFeedback?: { blockReason?: string };
            };
            try {
              chunk = JSON.parse(data);
            } catch {
              throw new ProviderError('AI_BAD_RESPONSE', 'invalid JSON chunk');
            }
            if (chunk.promptFeedback?.blockReason)
              throw new ProviderError('AI_BLOCKED', chunk.promptFeedback.blockReason);
            const candidate = chunk.candidates?.[0];
            const parts = candidate?.content?.parts ?? [];
            // Asl qismlar (thoughtSignature bilan) keyingi so'rovda o'zgartirmasdan qaytariladi
            modelParts.push(...parts);
            for (const p of parts) {
              if (p.functionCall?.name) {
                calls.push({
                  id: randomUUID(),
                  providerId: p.functionCall.id,
                  name: p.functionCall.name,
                  args: p.functionCall.args ?? {},
                });
              }
            }
            const text = parts
              .filter((p) => !p.thought && typeof p.text === 'string')
              .map((p) => p.text)
              .join('');
            if (text) {
              produced = true;
              yield { type: 'text' as const, text };
            }
            if (candidate?.finishReason === 'SAFETY' && !produced && calls.length === 0)
              throw new ProviderError('AI_BLOCKED', 'SAFETY');
          }
        } catch (error) {
          throw mapFetchError(error, guard.signal, false);
        }
        if (calls.length > 0) {
          yield { type: 'tool_calls' as const, calls, raw: modelParts };
          return;
        }
        if (!produced) throw new ProviderError('AI_BAD_RESPONSE', 'no text');
      } finally {
        guard.dispose();
      }
    },
  };
}
