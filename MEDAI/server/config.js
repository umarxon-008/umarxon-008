/**
 * MEDAI server konfiguratsiyasi.
 * Barcha maxfiy qiymatlar faqat .env orqali o'qiladi — kodga yozilmaydi.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(here, '..');

dotenv.config({ path: path.join(ROOT_DIR, '.env'), quiet: true });

const bool = (v, def = false) => (v === undefined || v === '' ? def : /^(1|true|yes|on)$/i.test(v));

export const config = Object.freeze({
  port: Number.parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '127.0.0.1',
  apiKey: (process.env.ANTHROPIC_API_KEY || '').trim(),
  model: (process.env.MEDAI_MODEL || 'claude-opus-5-5').trim(),
  forceDemo: bool(process.env.MEDAI_FORCE_DEMO, false),
  refusalFallback: bool(process.env.MEDAI_REFUSAL_FALLBACK, true),
  maxFileBytes: 10 * 1024 * 1024,
  maxMessageChars: 4000,
  maxHistoryMessages: 20,
  maxLeafletChars: 30000,
  rateLimitPerMinute: Number.parseInt(process.env.MEDAI_RATE_LIMIT, 10) || 30,
});

/** AI haqiqatan ham ulanganmi? Kalit bo'lmasa — demo rejim. */
export function isAiEnabled() {
  return Boolean(config.apiKey) && !config.forceDemo;
}
