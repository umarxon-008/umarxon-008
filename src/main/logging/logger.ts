import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEY =
  /(api[-_]?key|token|secret|password|passwd|authorization|cookie|audio|image|screenshot|transcript)/i;
const MAX_STRING = 500;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Logga yoziladigan ma'lumotdan maxfiy qiymatlarni olib tashlaydi.
 * Kalit nomi sezgir bo'lsa, qiymat o'rniga [REDACTED] yoziladi.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[DEPTH_LIMIT]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…[${value.length} chars]` : value;
  }
  if (typeof value !== 'object') return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(v, depth + 1);
  }
  return out;
}

export interface Logger {
  debug(event: string, data?: Record<string, unknown>): void;
  info(event: string, data?: Record<string, unknown>): void;
  warn(event: string, data?: Record<string, unknown>): void;
  error(event: string, data?: Record<string, unknown>): void;
}

export function createLogger(directory: string, options: { echo?: boolean } = {}): Logger {
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
  const file = join(directory, 'marius.log');

  const rotateIfNeeded = (): void => {
    try {
      if (existsSync(file) && statSync(file).size > MAX_FILE_BYTES) {
        renameSync(file, join(directory, 'marius.1.log'));
      }
    } catch {
      // rotatsiya muvaffaqiyatsiz bo'lsa ham ilova ishlashda davom etadi
    }
  };

  const write = (level: LogLevel, event: string, data?: Record<string, unknown>): void => {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      ...(data ? { data: redact(data) } : {}),
    });
    try {
      rotateIfNeeded();
      appendFileSync(file, `${line}\n`, 'utf8');
    } catch {
      // disk to'la yoki ruxsat yo'q: logging ilovani to'xtatmasligi kerak
    }
    if (options.echo) {
      (level === 'error' ? console.error : console.log)(line);
    }
  };

  return {
    debug: (e, d) => write('debug', e, d),
    info: (e, d) => write('info', e, d),
    warn: (e, d) => write('warn', e, d),
    error: (e, d) => write('error', e, d),
  };
}
