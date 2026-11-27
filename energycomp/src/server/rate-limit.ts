import 'server-only';
import { rateLimited } from './errors';

// Oddiy in-memory fixed-window limiter. Bitta server instansiyasi uchun yetarli;
// bir nechta instansiyada Redis kabi umumiy saqlovchi kerak (docs/ROADMAP.md).
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return;
  }
  b.count += 1;
  if (b.count > limit) throw rateLimited();
}

export function resetRateLimits(): void {
  buckets.clear();
}
