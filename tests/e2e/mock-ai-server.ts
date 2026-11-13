import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

/**
 * E2E uchun soxta AI server: Ollama (/api/*) va Gemini (/v1beta/*) API'larini taqlid qiladi.
 * Ilova unga haqiqiy HTTP so'rovlar yuboradi, ya'ni butun zanjir (main → fetch → oqim → IPC → UI) sinaladi.
 */
export const MOCK_GEMINI_KEY = 'AIza-E2E-TEST-KEY-0123456789';
export const MOCK_REPLY = 'Assalomu alaykum! Men **MARIUS**man. O‘zbek tilida yordam beraman.';

export interface MockAiServer {
  url: string;
  requests: { path: string; body: unknown; headers: IncomingMessage['headers'] }[];
  failNext: boolean;
  close(): Promise<void>;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const words = (text: string) => text.match(/\S+\s*/g) ?? [];

export async function startMockAiServer(): Promise<MockAiServer> {
  const state: MockAiServer = { url: '', requests: [], failNext: false, close: async () => undefined };

  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'http://x');
    const raw = req.method === 'POST' ? await readBody(req) : '';
    const body: unknown = raw ? JSON.parse(raw) : null;
    state.requests.push({ path: url.pathname, body, headers: req.headers });

    // ---- Ollama ----
    if (url.pathname === '/api/tags') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ models: [{ name: 'mock-uz:latest' }] }));
      return;
    }
    if (url.pathname === '/api/chat') {
      if (state.failNext) {
        state.failNext = false;
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'mock failure' }));
        return;
      }
      const messages = (body as { messages: { content: string }[] }).messages;
      const slow = messages.at(-1)?.content.includes('SEKIN');
      res.writeHead(200, { 'content-type': 'application/x-ndjson' });
      const parts = slow ? Array.from({ length: 200 }, (_, i) => `so‘z${i} `) : words(MOCK_REPLY);
      for (const p of parts) {
        if (res.destroyed) return;
        res.write(`${JSON.stringify({ message: { role: 'assistant', content: p }, done: false })}\n`);
        await sleep(slow ? 150 : 20);
      }
      res.end(`${JSON.stringify({ message: { role: 'assistant', content: '' }, done: true })}\n`);
      return;
    }

    // ---- Gemini ----
    if (url.pathname.startsWith('/v1beta/')) {
      if (req.headers['x-goog-api-key'] !== MOCK_GEMINI_KEY) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            error: { code: 400, status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] },
          }),
        );
        return;
      }
      if (url.pathname === '/v1beta/models') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            models: [{ name: 'models/mock-gemini', supportedGenerationMethods: ['generateContent'] }],
          }),
        );
        return;
      }
      if (url.pathname.endsWith(':streamGenerateContent') && url.searchParams.get('alt') === 'sse') {
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        for (const p of words(MOCK_REPLY)) {
          res.write(
            `data: ${JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: p }] } }] })}\r\n\r\n`,
          );
          await sleep(20);
        }
        res.end();
        return;
      }
    }

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  };

  const server: Server = createServer((req, res) => void handler(req, res));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  state.url = `http://127.0.0.1:${port}`;
  state.close = () =>
    new Promise((r) => {
      server.closeAllConnections();
      server.close(() => r());
    });
  return state;
}
