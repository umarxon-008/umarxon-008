/**
 * Server API mijozi. API kaliti brauzerda YO'Q — barcha AI so'rovlari server orqali o'tadi.
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

export const api = {
  status: () => request('/api/status'),
  chat: (messages, signal) => request('/api/chat', { method: 'POST', json: { messages }, signal }),
  analyzeReport(file, signal) {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return request('/api/analyze-report', { method: 'POST', formData: fd, signal });
  },
  explainMedicine({ name, text, file }, signal) {
    if (file) {
      const fd = new FormData();
      fd.append('file', file, file.name);
      return request('/api/explain-medicine', { method: 'POST', formData: fd, signal });
    }
    return request('/api/explain-medicine', { method: 'POST', json: name ? { name } : { text }, signal });
  },
};
