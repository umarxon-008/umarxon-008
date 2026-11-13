import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

/**
 * E2E uchun soxta AI server: Ollama (/api/*) va Gemini (/v1beta/*) API'larini taqlid qiladi.
 * Ilova unga haqiqiy HTTP so'rovlar yuboradi, ya'ni butun zanjir (main → fetch → oqim → IPC → UI) sinaladi.
 */
export const MOCK_GEMINI_KEY = 'AIza-E2E-TEST-KEY-0123456789';
export const MOCK_YOUTUBE_KEY = 'AIza-E2E-YOUTUBE-KEY-123';
export const MOCK_THOUGHT_SIGNATURE = 'SIG-E2E-THOUGHT';
export const MOCK_TRANSCRIPT = 'Salom MARIUS, qalaysan?';
export const MOCK_REPLY = 'Assalomu alaykum! Men **MARIUS**man. O‘zbek tilida yordam beraman.';

export interface MockAiServer {
  url: string;
  requests: { path: string; body: unknown; headers: IncomingMessage['headers'] }[];
  /** Oxirgi transkripsiya so'rovidagi audio baytlari (WAV sarlavhasini tekshirish uchun) */
  lastAudio: Buffer | null;
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
  const state: MockAiServer = {
    url: '',
    requests: [],
    lastAudio: null,
    failNext: false,
    close: async () => undefined,
  };

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
      const { messages, tools } = body as {
        messages: { role: string; content: string }[];
        tools?: unknown[];
      };
      const last = messages.at(-1);
      // Vosita chaqiruvi: "kalkulyator" so'ralsa launch_app, natija kelgach yakuniy javob
      if (tools?.length && last?.role === 'user' && /kalkulyator/i.test(last.content)) {
        res.writeHead(200, { 'content-type': 'application/x-ndjson' });
        res.end(
          `${JSON.stringify({ message: { role: 'assistant', content: '', tool_calls: [{ function: { name: 'launch_app', arguments: { name: 'kalkulyator' } } }] }, done: true })}\n`,
        );
        return;
      }
      // Umumiy test mexanizmi: xabarda TOOL:{"name":...,"arguments":{...}} bo'lsa, o'sha vosita chaqiriladi
      const toolMatch = last?.role === 'user' ? /TOOL:(\{.*\})\s*$/s.exec(last.content) : null;
      if (tools?.length && toolMatch) {
        const call = JSON.parse(toolMatch[1]!) as { name: string; arguments: Record<string, unknown> };
        res.writeHead(200, { 'content-type': 'application/x-ndjson' });
        res.end(
          `${JSON.stringify({ message: { role: 'assistant', content: '', tool_calls: [{ function: call }] }, done: true })}\n`,
        );
        return;
      }
      if (last?.role === 'tool') {
        const result = JSON.parse(last.content) as { ok: boolean; verified: boolean | null; message: string };
        const isCalc = messages.some((m) => m.role === 'user' && /kalkulyator/i.test(m.content));
        const text = !isCalc
          ? `Natija: ${result.message}`
          : result.ok
            ? result.verified
              ? 'Kalkulyator ochildi.'
              : 'Buyruq yuborildi.'
            : 'Amal bajarilmadi.';
        res.writeHead(200, { 'content-type': 'application/x-ndjson' });
        res.end(
          `${JSON.stringify({ message: { role: 'assistant', content: text }, done: false })}\n${JSON.stringify({ message: { role: 'assistant', content: '' }, done: true })}\n`,
        );
        return;
      }
      const slow = last?.content.includes('SEKIN');
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

    // ---- YouTube Data API ----
    if (url.pathname === '/youtube/v3/search') {
      if (req.headers['x-goog-api-key'] !== MOCK_YOUTUBE_KEY) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 400, errors: [{ reason: 'keyInvalid' }] } }));
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          items: [
            {
              id: { videoId: 'uzCpp01' },
              snippet: {
                title: 'C++ for sikli &#39;o‘zbek tilida&#39;',
                channelTitle: 'Dasturlash Darslari',
                publishedAt: '2025-01-10T00:00:00Z',
              },
            },
          ],
        }),
      );
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
      if (url.pathname.endsWith(':generateContent')) {
        const b = body as {
          contents: { parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] }[];
          generationConfig?: { responseModalities?: string[] };
        };
        res.writeHead(200, { 'content-type': 'application/json' });
        if (b.generationConfig?.responseModalities?.includes('AUDIO')) {
          // 0.6 s, 24 kHz, 16-bit PCM sinus (Gemini TTS formati)
          const samples = 24000 * 0.6;
          const pcm = Buffer.alloc(samples * 2);
          for (let i = 0; i < samples; i++) pcm.writeInt16LE(Math.round(Math.sin(i / 8) * 8000), i * 2);
          res.end(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        inlineData: {
                          mimeType: 'audio/L16;codec=pcm;rate=24000',
                          data: pcm.toString('base64'),
                        },
                      },
                    ],
                  },
                },
              ],
            }),
          );
          return;
        }
        const audio = b.contents[0]?.parts.find((p) => p.inlineData)?.inlineData;
        state.lastAudio = audio ? Buffer.from(audio.data, 'base64') : null;
        res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: MOCK_TRANSCRIPT }] } }] }));
        return;
      }
      if (url.pathname.endsWith(':streamGenerateContent') && url.searchParams.get('alt') === 'sse') {
        const b = body as {
          contents: {
            role: string;
            parts: { text?: string; functionResponse?: { response: { ok: boolean } } }[];
          }[];
          tools?: unknown[];
        };
        const lastTurn = b.contents.at(-1);
        const userText = lastTurn?.parts.map((p) => p.text ?? '').join('') ?? '';
        if (b.tools?.length && lastTurn?.role === 'user' && /kalkulyator/i.test(userText)) {
          res.writeHead(200, { 'content-type': 'text/event-stream' });
          res.end(
            `data: ${JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'launch_app', args: { name: 'Calculator' } }, thoughtSignature: MOCK_THOUGHT_SIGNATURE }] } }] })}\r\n\r\n`,
          );
          return;
        }
        const fr = lastTurn?.parts.find((p) => p.functionResponse)?.functionResponse;
        if (fr) {
          res.writeHead(200, { 'content-type': 'text/event-stream' });
          res.end(
            `data: ${JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: fr.response.ok ? 'Kalkulyator ochildi.' : 'Amal bajarilmadi.' }] } }] })}\r\n\r\n`,
          );
          return;
        }
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
