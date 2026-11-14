import { GEMINI_DEFAULT_BASE_URL } from './gemini';
import { mapFetchError, ProviderError, type FetchLike } from './types';

/**
 * Gemini orqali ovoz: nutq → matn (STT) va matn → nutq (TTS).
 * Maydonlar rasmiy `@google/genai` SDK manba kodidan tasdiqlangan:
 * - audio kirish: `parts[].inlineData { mimeType, data(base64) }` (audio/wav qo'llanadi)
 * - ovozli javob: `generationConfig.responseModalities: ["AUDIO"]`, javob `parts[].inlineData`
 * Bu funksiyalar faqat foydalanuvchi aniq rozilik bergandan keyin chaqiriladi (VoiceService).
 */

const API_VERSION = 'v1beta';

/** Modelga beriladigan ichki ko'rsatma: faqat transkript, izohsiz. */
export const TRANSCRIBE_INSTRUCTION = [
  'Transcribe the speech in this audio exactly as spoken.',
  'The speaker most likely speaks Uzbek and may mix in Russian or English words (app names, technical terms).',
  'Write Uzbek in the Latin alphabet with the letters o‘ and g‘. Keep foreign words as they are usually written.',
  'Output ONLY the transcript text: no quotes, no translation, no comments.',
  'If there is no intelligible speech, output nothing.',
].join(' ');

interface GeminiAudioOptions {
  apiKey: () => Promise<string | null>;
  fetch?: FetchLike;
  baseUrl?: string;
  timeoutMs?: number;
}

interface GenerateResponse {
  candidates?: {
    content?: {
      parts?: { text?: string; thought?: boolean; inlineData?: { mimeType?: string; data?: string } }[];
    };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; status?: string; details?: { reason?: string }[] };
}

function httpError(status: number, body: GenerateResponse): ProviderError {
  const s = body.error?.status ?? '';
  const reason = body.error?.details?.find((d) => d.reason)?.reason ?? '';
  const detail = `${status} ${s} ${reason}`.trim();
  if (status === 401 || status === 403 || reason === 'API_KEY_INVALID')
    return new ProviderError('AI_AUTH_INVALID', detail);
  if (status === 429) return new ProviderError('AI_RATE_LIMITED', detail);
  if (status === 404) return new ProviderError('AI_MODEL_NOT_FOUND', detail);
  if (status >= 500) return new ProviderError('AI_UNAVAILABLE', detail);
  return new ProviderError('AI_BAD_RESPONSE', detail);
}

export function createGeminiAudio(options: GeminiAudioOptions) {
  const doFetch = options.fetch ?? fetch;
  const base = (options.baseUrl ?? GEMINI_DEFAULT_BASE_URL).replace(/\/+$/, '');

  async function generate(model: string, body: unknown, signal?: AbortSignal): Promise<GenerateResponse> {
    const key = await options.apiKey();
    if (!key) throw new ProviderError('AI_NOT_CONFIGURED');
    const s = signal ?? AbortSignal.timeout(options.timeoutMs ?? 60_000);
    let res: Response;
    try {
      res = await doFetch(`${base}/${API_VERSION}/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
        signal: s,
      });
    } catch (error) {
      throw mapFetchError(error, s, false);
    }
    let json: GenerateResponse = {};
    try {
      json = (await res.json()) as GenerateResponse;
    } catch {
      if (res.ok) throw new ProviderError('AI_BAD_RESPONSE', 'invalid JSON');
    }
    if (!res.ok) throw httpError(res.status, json);
    if (json.promptFeedback?.blockReason)
      throw new ProviderError('AI_BLOCKED', json.promptFeedback.blockReason);
    return json;
  }

  return {
    /** WAV audio → o'zbekcha matn. Nutq bo'lmasa bo'sh qator qaytaradi. */
    async transcribe(
      model: string,
      audioBase64: string,
      mimeType: string,
      signal?: AbortSignal,
    ): Promise<string> {
      const json = await generate(
        model,
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: TRANSCRIBE_INSTRUCTION }, { inlineData: { mimeType, data: audioBase64 } }],
            },
          ],
          generationConfig: { temperature: 0 },
        },
        signal,
      );
      const text = (json.candidates?.[0]?.content?.parts ?? [])
        .filter((p) => !p.thought && typeof p.text === 'string')
        .map((p) => p.text)
        .join('')
        .trim();
      return cleanTranscript(text);
    },

    /** Rasm (ekran) + savol → o'zbekcha matnli javob. `inlineData` rasm uchun ham ishlatiladi. */
    async describeImage(
      model: string,
      prompt: string,
      imageBase64: string,
      mimeType: string,
      signal?: AbortSignal,
    ): Promise<string> {
      const json = await generate(
        model,
        {
          contents: [
            { role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }] },
          ],
          generationConfig: { temperature: 0.2 },
        },
        signal,
      );
      const text = (json.candidates?.[0]?.content?.parts ?? [])
        .filter((p) => !p.thought && typeof p.text === 'string')
        .map((p) => p.text)
        .join('')
        .trim();
      if (!text) throw new ProviderError('AI_BAD_RESPONSE', 'empty vision answer');
      return text;
    },

    /** Matn → ovoz. Natija base64 audio va uning MIME turi (masalan, audio/L16;codec=pcm;rate=24000). */
    async synthesize(
      model: string,
      text: string,
      signal?: AbortSignal,
    ): Promise<{ audio: string; mimeType: string }> {
      const json = await generate(
        model,
        {
          contents: [{ role: 'user', parts: [{ text }] }],
          generationConfig: { responseModalities: ['AUDIO'] },
        },
        signal,
      );
      const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part?.inlineData?.data) throw new ProviderError('AI_BAD_RESPONSE', 'no audio');
      return { audio: part.inlineData.data, mimeType: part.inlineData.mimeType ?? 'audio/L16;rate=24000' };
    },
  };
}

export type GeminiAudio = ReturnType<typeof createGeminiAudio>;

/** Model ba'zan transkriptni qo'shtirnoqqa oladi yoki "[ovoz yo'q]" kabi izoh yozadi: tozalaymiz. */
export function cleanTranscript(text: string): string {
  let t = text.trim();
  t = t.replace(/^["“”«»']+|["“”«»']+$/g, '').trim();
  if (/^\[.*\]$/.test(t) || /^\(.*\)$/.test(t)) return '';
  return t;
}
