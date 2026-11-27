import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { AppError, badRequest, forbidden, validationError } from './errors';

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: { code: string; message: string; details?: unknown } };

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, init);
}

export function fail(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json<ApiFailure>(
      { ok: false, error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json<ApiFailure>(
      {
        ok: false,
        error: { code: 'VALIDATION', message: "Ma'lumotlar noto'g'ri", details: formatZodIssues(err) },
      },
      { status: 422 },
    );
  }
  console.error('[api] kutilmagan xato', err);
  return NextResponse.json<ApiFailure>(
    { ok: false, error: { code: 'INTERNAL', message: 'Serverda kutilmagan xato yuz berdi' } },
    { status: 500 },
  );
}

export function formatZodIssues(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Cookie asosidagi sessiya uchun CSRF himoyasi: o'zgartiruvchi so'rovlarda Origin host bilan mos bo'lishi shart. */
export function assertSameOrigin(req: Request): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return;
  const origin = req.headers.get('origin');
  if (!origin) return; // brauzer bo'lmagan klientlar (masalan, curl) — cookie baribir kerak
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    if (new URL(origin).host !== host) throw forbidden("So'rov manbasi tasdiqlanmadi");
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw forbidden("So'rov manbasi tasdiqlanmadi");
  }
}

type Handler<P> = (req: Request, ctx: { params: P }) => Promise<Response>;

/** Route handler o'rami: CSRF tekshiruvi + yagona xato formati. */
export function route<P = Record<string, string>>(
  handler: (req: Request, params: P) => Promise<Response>,
): Handler<Promise<P>> {
  return async (req, ctx) => {
    try {
      assertSameOrigin(req);
      return await handler(req, await ctx.params);
    } catch (err) {
      return fail(err);
    }
  };
}

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("So'rov tanasi JSON formatida emas");
  }
  const res = schema.safeParse(body);
  if (!res.success) throw validationError("Ma'lumotlar noto'g'ri", formatZodIssues(res.error));
  return res.data;
}

export function parseQuery<T>(req: Request, schema: ZodType<T>): T {
  const url = new URL(req.url);
  const obj: Record<string, string | string[]> = {};
  for (const key of new Set(url.searchParams.keys())) {
    const all = url.searchParams.getAll(key);
    obj[key] = all.length > 1 ? all : all[0]!;
  }
  const res = schema.safeParse(obj);
  if (!res.success) throw validationError("So'rov parametrlari noto'g'ri", formatZodIssues(res.error));
  return res.data;
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'local';
}
