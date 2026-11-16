import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/lib/auth";

/** API xatolarini foydalanuvchiga tushunarli (maxfiy tafsilotsiz) qaytarish. */
export function apiError(err: unknown) {
  // Next.js build paytida dinamik marshrutni aniqlash uchun tashlaydigan xatoni qayta uzatamiz.
  if ((err as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE") throw err;
  if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Tizimga kiring" }, { status: 401 });
  if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
  console.error("[api]", err instanceof Error ? err.name : "Error");
  return NextResponse.json({ error: "Serverda xatolik yuz berdi. Qayta urinib koʻring." }, { status: 500 });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function readJson(req: Request): Promise<any> {
  try { return await req.json(); } catch { throw new HttpError(400, "Soʻrov formati notoʻgʻri"); }
}
