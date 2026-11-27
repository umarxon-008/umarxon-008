export const hasDb = Boolean(process.env.TEST_DATABASE_URL);

/** next/headers uchun soxta cookie jar (route handler va servislarni HTTP serversiz sinash uchun). */
export const cookieJar = new Map<string, string>();
export const headerStore = new Headers({ 'user-agent': 'vitest', 'x-forwarded-for': '127.0.0.1' });

export const nextHeadersMock = {
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
    set: (name: string, value: string) => void cookieJar.set(name, value),
    delete: (name: string) => void cookieJar.delete(name),
    has: (name: string) => cookieJar.has(name),
  }),
  headers: async () => headerStore,
};

export function req(url: string, init: { method?: string; body?: unknown; origin?: string } = {}) {
  return new Request(`http://localhost:3000${url}`, {
    method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', origin: init.origin ?? 'http://localhost:3000', host: 'localhost:3000' },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

export const params = <T>(p: T) => ({ params: Promise.resolve(p) });
