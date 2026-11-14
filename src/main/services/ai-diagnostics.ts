import { existsSync, readFileSync, statSync } from 'node:fs';
import { sortGeminiModels } from '@shared/gemini-models';
import { buildSystemPrompt } from '../../modules/ai/system-prompt';
import {
  mapFetchError,
  ProviderError,
  type FetchLike,
  type ToolDeclarationForModel,
} from '../../modules/ai/types';
import type { AiService } from './ai-service';

/**
 * AI diagnostikasi: foydalanuvchi nusxalab yuborishi mumkin bo'lgan matnli hisobot.
 * Hisobotga API kalit, xabarlar matni yoki fayl mazmuni KIRMAYDI: faqat kalit turi va uzunligi,
 * HTTP statuslar, Google xato xabarlari va vaqtlar.
 * Har bir ishga tushirish bepul limitdan bir nechta (eng ko'pi ~8 ta) qisqa so'rov oladi.
 */
export interface DiagnosticsDeps {
  ai: AiService;
  appVersion: string;
  osName: string;
  geminiBaseUrl: string;
  logFile: string;
  /** Electron session.resolveProxy: tizim proxy sozlamasi ("DIRECT" yoki "PROXY host:port") */
  resolveProxy: (url: string) => Promise<string>;
  tools: () => ToolDeclarationForModel[];
  fetch?: FetchLike;
  now?: () => Date;
}

const ms = (start: number) => `${Date.now() - start} ms`;

function errText(error: unknown): string {
  if (error instanceof ProviderError) return `${error.code}${error.detail ? ` (${error.detail})` : ''}`;
  if (error instanceof Error) {
    const cause = (error as { cause?: { code?: string; message?: string } }).cause;
    return `${error.name}: ${error.message}${cause?.code ? ` [${cause.code}]` : ''}${cause?.message ? ` — ${cause.message}` : ''}`;
  }
  return String(error);
}

/** Logdagi oxirgi AI bilan bog'liq yozuvlar (log allaqachon redaksiya qilingan) */
export function recentAiLogLines(logFile: string, max = 8): string[] {
  if (!existsSync(logFile)) return [];
  const size = statSync(logFile).size;
  const text = readFileSync(logFile, 'utf8').slice(Math.max(0, size - 400_000));
  return text
    .split('\n')
    .filter((l) => /"(chat\.error|chat\.done|ai\.|voice\.error|tool\.failed)/.test(l))
    .slice(-max)
    .map((l) => (l.length > 600 ? `${l.slice(0, 599)}…` : l));
}

export async function runAiDiagnostics(deps: DiagnosticsDeps): Promise<string> {
  const doFetch = deps.fetch ?? fetch;
  const out: string[] = [];
  const line = (s = '') => out.push(s);
  const settings = await deps.ai.getSettings();
  const key = await deps.ai.geminiKeyInfo();

  line('=== MARIUS AI diagnostikasi ===');
  line(`Vaqt: ${(deps.now?.() ?? new Date()).toISOString()}`);
  line(`MARIUS: ${deps.appVersion} · ${deps.osName}`);
  line(
    `Faol AI: ${settings.provider ?? 'tanlanmagan'} · Gemini modeli: ${settings.gemini.model ?? 'tanlanmagan'}`,
  );
  line(`Gemini kaliti: ${key.stored ? `saqlangan (turi: ${key.kind}, uzunligi: ${key.length})` : 'YO‘Q'}`);
  line();

  // 1. Tarmoq
  line('--- 1. Tarmoq ---');
  try {
    line(`Tizim proxy (Windows): ${await deps.resolveProxy(deps.geminiBaseUrl)}`);
  } catch (e) {
    line(`Tizim proxy: aniqlab bo‘lmadi (${errText(e)})`);
  }
  const envProxy = ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy'].some((k) => process.env[k]);
  line(`Proxy muhit o‘zgaruvchisi: ${envProxy ? 'bor' : 'yo‘q'}`);
  const reachStart = Date.now();
  try {
    const signal = AbortSignal.timeout(15_000);
    const res = await doFetch(`${deps.geminiBaseUrl}/v1beta/models?pageSize=1`, { signal }).catch(
      (e: unknown) => {
        throw mapFetchError(e, signal, false);
      },
    );
    // Kalitsiz so'rov: 400/401/403 — server ochiq va javob beryapti degani
    line(`Google serveriga ulanish: OK (HTTP ${res.status}, ${ms(reachStart)})`);
  } catch (e) {
    line(`Google serveriga ulanish: XATO — ${errText(e)} (${ms(reachStart)})`);
  }
  line();

  if (!key.stored) {
    line('Gemini kaliti saqlanmagan: qolgan tekshiruvlar o‘tkazilmadi.');
    return finish();
  }

  // 2. Kalit va modellar ro'yxati
  line('--- 2. Kalit va modellar ro‘yxati ---');
  let models: string[];
  const listStart = Date.now();
  try {
    models = await deps.ai.gemini.listModels(AbortSignal.timeout(20_000));
    const sorted = sortGeminiModels(models);
    line(`Kalit qabul qilindi: ${models.length} ta model (${ms(listStart)})`);
    line(
      `Suhbat modellari: ${
        sorted
          .filter((m) => m.kind !== 'other')
          .map((m) => m.name)
          .join(', ') || 'yo‘q'
      }`,
    );
  } catch (e) {
    line(`Modellar ro‘yxati: XATO — ${errText(e)} (${ms(listStart)})`);
    return finish();
  }
  line();

  // 3. Oddiy so'rov (generateContent)
  line('--- 3. Modellarni sinash (qisqa so‘rov) ---');
  const candidates = [
    ...new Set([
      ...(settings.gemini.model ? [settings.gemini.model] : []),
      ...sortGeminiModels(models)
        .filter((m) => m.kind === 'recommended')
        .slice(0, 3)
        .map((m) => m.name),
    ]),
  ].slice(0, 4);
  let working: string | null = null;
  for (const model of candidates) {
    const t = Date.now();
    try {
      await deps.ai.geminiAudio.probe(model, AbortSignal.timeout(45_000));
      line(`✓ ${model}: ishlaydi (${ms(t)})`);
      working ??= model;
    } catch (e) {
      line(`✗ ${model}: ${errText(e)} (${ms(t)})`);
    }
  }
  line();

  // 4. Suhbatdagidek oqimli javob (streamGenerateContent + MARIUS ko'rsatmasi va vositalari)
  const streamModel = settings.gemini.model ?? working;
  line('--- 4. Oqimli javob (suhbat kabi) ---');
  if (!streamModel) {
    line('Sinash uchun model yo‘q.');
  } else {
    for (const withTools of [false, true]) {
      const t = Date.now();
      let first: number | null = null;
      let chars = 0;
      try {
        for await (const ev of deps.ai.gemini.streamChat(
          {
            model: streamModel,
            system: buildSystemPrompt(new Date(), { toolsEnabled: withTools }),
            messages: [{ role: 'user', content: 'Salom! Bitta qisqa gap bilan javob ber.' }],
            ...(withTools ? { tools: deps.tools() } : {}),
          },
          AbortSignal.timeout(130_000),
        )) {
          first ??= Date.now() - t;
          if (ev.type === 'text') chars += ev.text.length;
        }
        line(
          `✓ ${streamModel} ${withTools ? `+ ${deps.tools().length} ta vosita` : '(vositalarsiz)'}: birinchi bo‘lak ${first ?? '—'} ms, jami ${ms(t)}, ${chars} belgi`,
        );
      } catch (e) {
        line(
          `✗ ${streamModel} ${withTools ? `+ ${deps.tools().length} ta vosita` : '(vositalarsiz)'}: ${errText(e)} (${ms(t)}${first !== null ? `, birinchi bo‘lak ${first} ms` : ', hech narsa kelmadi'})`,
        );
      }
    }
  }
  line();
  return finish();

  function finish(): string {
    line('--- Oxirgi AI yozuvlari (log) ---');
    const logs = recentAiLogLines(deps.logFile);
    if (logs.length === 0) line('yo‘q');
    for (const l of logs) line(l);
    line('=== tugadi ===');
    return out.join('\n');
  }
}
