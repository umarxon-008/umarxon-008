/**
 * MEDAI server konfiguratsiyasi.
 * Barcha maxfiy qiymatlar faqat .env orqali o'qiladi — kodga yozilmaydi.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Netlify bundleri (CJS) da import.meta.url bo'sh bo'ladi — u holda joriy papka olinadi.
const here = import.meta.url ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd();
export const ROOT_DIR = path.resolve(here, '..');

dotenv.config({ path: path.join(ROOT_DIR, '.env'), quiet: true });

/** Serverless muhitda (Netlify Functions / AWS Lambda) ishlayaptimi? */
export const isServerless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);

const bool = (v, def = false) => (v === undefined || v === '' ? def : /^(1|true|yes|on)$/i.test(v));

const cfg = {
  port: Number.parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '127.0.0.1',
  apiKey: (process.env.ANTHROPIC_API_KEY || '').trim(),
  model: (process.env.MEDAI_MODEL || 'claude-opus-5-5').trim(),
  forceDemo: bool(process.env.MEDAI_FORCE_DEMO, false),
  refusalFallback: bool(process.env.MEDAI_REFUSAL_FALLBACK, true),
  // Netlify Functions so'rov tanasini ~6 MB bilan cheklaydi (fayl base64 ko'rinishida keladi),
  // shuning uchun serverless muhitda standart chegara 4 MB.
  maxFileMb: Number.parseFloat(process.env.MEDAI_MAX_FILE_MB) || (isServerless ? 4 : 10),
  maxMessageChars: 4000,
  maxHistoryMessages: 20,
  maxLeafletChars: 30000,
  rateLimitPerMinute: Number.parseInt(process.env.MEDAI_RATE_LIMIT, 10) || 30,
};
cfg.maxFileBytes = Math.round(cfg.maxFileMb * 1024 * 1024);
export const config = Object.freeze(cfg);

/** AI haqiqatan ham ulanganmi? Kalit bo'lmasa — demo rejim. */
export function isAiEnabled() {
  return Boolean(config.apiKey) && !config.forceDemo;
}
