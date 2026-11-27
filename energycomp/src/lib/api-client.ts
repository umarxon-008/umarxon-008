// Brauzer tomonidagi API chaqiruvlar. Server javobi: { ok, data } yoki { ok:false, error }.
export class ApiClientError extends Error {
  code: string;
  status: number;
  details?: Record<string, string> | unknown;
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
  fieldErrors(): Record<string, string> {
    return this.details && typeof this.details === 'object' ? (this.details as Record<string, string>) : {};
  }
}

export async function api<T>(url: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
      headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
      cache: 'no-store',
      credentials: 'same-origin',
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiClientError('NETWORK', "Serverga ulanib bo'lmadi. Internet aloqasini tekshiring.", 0);
  }
  let json: { ok: boolean; data?: T; error?: { code: string; message: string; details?: unknown } } | null = null;
  try {
    json = await res.json();
  } catch {
    /* bo'sh javob */
  }
  if (!res.ok || !json?.ok) {
    if (res.status === 401 && typeof window !== 'undefined' && !url.includes('/api/auth/')) {
      // Sessiya tugagan: to'liq qayta yuklash bilan login sahifasiga (klient holatini tozalash uchun)
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/login?expired=1';
    }
    throw new ApiClientError(
      json?.error?.code ?? 'HTTP_' + res.status,
      json?.error?.message ?? `So'rov bajarilmadi (${res.status})`,
      res.status,
      json?.error?.details,
    );
  }
  return json.data as T;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiClientError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Kutilmagan xato';
}
