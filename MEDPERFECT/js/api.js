/**
 * API mijozi. API kaliti brauzerda YO'Q — barcha AI so'rovlari server orqali o'tadi.
 * Ishlash tartibi:
 *   - MEDAI serveri topilsa (npm start yoki Netlify Functions) — so'rovlar serverga yuboriladi;
 *   - server topilmasa (statik hosting) — brauzerdagi demo dvigatel (js/local-api.js) ishlatiladi.
 * Tibbiy ma'lumotlar console ga yozilmaydi.
 */

export class ApiError extends Error {
  constructor(message, { status = 0, kind = 'error' } = {}) {
    super(message);
    this.status = status;
    this.kind = kind;
  }
}

const NETWORK_MSG = 'Server bilan aloqa yoʻq. Internet aloqasini va server ishga tushirilganini tekshiring.';
const TIMEOUT_MS = 130_000;

async function request(path, { method = 'GET', json, formData, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), TIMEOUT_MS);
  const onAbort = () => controller.abort(signal.reason);
  signal?.addEventListener('abort', onAbort, { once: true });

  let res;
  try {
    res = await fetch(path, {
      method,
      headers: json ? { 'Content-Type': 'application/json' } : undefined,
      body: json ? JSON.stringify(json) : formData,
      signal: controller.signal,
    });
  } catch (err) {
    if (signal?.aborted) throw new ApiError('Soʻrov bekor qilindi.', { kind: 'aborted' });
    if (err?.name === 'TimeoutError' || controller.signal.reason?.name === 'TimeoutError') {
      throw new ApiError('Server javob berishi juda uzoq choʻzildi. Qayta urinib koʻring.', { kind: 'timeout' });
    }
    throw new ApiError(NETWORK_MSG, { kind: 'network' });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }

  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const msg = data?.error || (res.status >= 500 ? 'Serverda xatolik yuz berdi. Qayta urinib koʻring.' : 'Soʻrovni bajarib boʻlmadi.');
    throw new ApiError(msg, { status: res.status, kind: data?.kind || 'http' });
  }
  if (!data) throw new ApiError('Serverdan notoʻgʻri javob keldi.', { status: res.status, kind: 'parse' });
  return data;
}

/* ---------------- Server yoki brauzer dvigatelini aniqlash ---------------- */
let enginePromise = null;

/** 'server' | 'browser' — bir marta aniqlanadi. */
export function detectEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      if (location.protocol === 'file:') return 'browser'; // fayl sifatida ochilgan — server bo'lishi mumkin emas
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 4000);
        const res = await fetch('api/status', { signal: controller.signal, headers: { Accept: 'application/json' } });
        clearTimeout(t);
        const data = res.ok ? await res.json() : null;
        if (data && (data.mode === 'demo' || data.mode === 'ai')) return 'server';
      } catch { /* server yo'q */ }
      return 'browser';
    })();
  }
  return enginePromise;
}

const local = () => import('./local-api.js').then((m) => m.localApi);

const serverApi = {
  status: () => request('api/status').then((d) => ({ ...d, engine: 'server' })),
  chat: (messages, signal) => request('api/chat', { method: 'POST', json: { messages }, signal }),
  analyzeReport(file, signal) {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return request('api/analyze-report', { method: 'POST', formData: fd, signal });
  },
  explainMedicine({ name, text, file }, signal) {
    if (file) {
      const fd = new FormData();
      fd.append('file', file, file.name);
      return request('api/explain-medicine', { method: 'POST', formData: fd, signal });
    }
    return request('api/explain-medicine', { method: 'POST', json: name ? { name } : { text }, signal });
  },
};

const pick = async () => ((await detectEngine()) === 'server' ? serverApi : local());

export const api = {
  status: async () => (await pick()).status(),
  chat: async (messages, signal) => (await pick()).chat(messages, signal),
  analyzeReport: async (file, signal) => (await pick()).analyzeReport(file, signal),
  explainMedicine: async (payload, signal) => (await pick()).explainMedicine(payload, signal),
};
