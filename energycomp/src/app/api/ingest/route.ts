import { NextResponse } from 'next/server';
import { fail, ok, parseJson } from '@/server/api';
import { checkRateLimit } from '@/server/rate-limit';
import { ingestSchema } from '@/schemas/telemetry';
import { ingestReadings } from '@/server/services/integrations';

/**
 * Tashqi gateway'lar uchun HTTP ingest. Cookie ishlatilmaydi — faqat Bearer token (shu sababli CSRF tekshiruvi kerak emas).
 * POST /api/ingest  Authorization: Bearer ec_...  { readings: [...] }
 */
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const auth = req.headers.get('authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
    checkRateLimit(`ingest:${token?.slice(0, 12) ?? 'none'}`, 600, 60_000);
    const payload = await parseJson(req, ingestSchema);
    return ok(await ingestReadings(token, payload));
  } catch (err) {
    return fail(err);
  }
}
