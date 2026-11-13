import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatEvent } from '@shared/ipc';
import { createGeminiProvider, toGeminiContents } from '../../src/modules/ai/gemini';
import { createOllamaProvider, toOllamaMessages } from '../../src/modules/ai/ollama';
import {
  ProviderError,
  type AIProvider,
  type ChatRequest,
  type StreamEvent,
} from '../../src/modules/ai/types';
import { MemoryConversationStore, SqliteConversationStore } from '../../src/main/database/conversation-store';
import { ChatService, type ToolRunner } from '../../src/main/services/chat-service';
import { collect, streamOf } from './helpers/streams';
import { tempDatabase } from './helpers/db';

const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const decl = [
  {
    name: 'launch_app',
    description: 'Open app',
    parameters: { type: 'object', properties: { name: { type: 'string' } } },
  },
];

describe('Gemini function calling', () => {
  it('functionCall qismini tool_calls hodisasiga aylantiradi va asl qismlarni (thoughtSignature) saqlaydi', async () => {
    const part = {
      functionCall: { name: 'launch_app', args: { name: 'Calculator' } },
      thoughtSignature: 'SIG-123',
    };
    const fetchMock = vi.fn(
      async () =>
        new Response(
          streamOf([`data: ${JSON.stringify({ candidates: [{ content: { parts: [part] } }] })}\n\n`]),
        ),
    );
    const p = createGeminiProvider({
      apiKey: async () => 'k-1234567890',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const events = await collect(
      p.streamChat(
        { model: 'm', system: 's', messages: [{ role: 'user', content: 'och' }], tools: decl },
        new AbortController().signal,
      ),
    );
    expect(events).toHaveLength(1);
    const ev = events[0] as Extract<StreamEvent, { type: 'tool_calls' }>;
    expect(ev.calls[0]).toMatchObject({ name: 'launch_app', args: { name: 'Calculator' } });
    expect(ev.raw).toEqual([part]);
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.tools[0].functionDeclarations[0]).toMatchObject({
      name: 'launch_app',
      parametersJsonSchema: decl[0]!.parameters,
    });
  });

  it('keyingi so‘rovda model qismi o‘zgarmasdan, natija esa role "user" functionResponse bo‘lib boradi', () => {
    const raw = [
      {
        functionCall: { id: 'c1', name: 'launch_app', args: { name: 'Calculator' } },
        thoughtSignature: 'SIG-123',
      },
    ];
    const contents = toGeminiContents([
      { role: 'user', content: 'Kalkulyatorni och' },
      {
        role: 'assistant',
        content: '',
        toolCalls: [{ id: 'x', providerId: 'c1', name: 'launch_app', args: {} }],
        raw,
      },
      {
        role: 'tool',
        callId: 'x',
        providerId: 'c1',
        name: 'launch_app',
        result: { ok: true, message: 'ochildi' },
      },
      { role: 'tool', callId: 'y', name: 'get_system_info', result: 'matn' },
    ]);
    expect(contents[1]).toEqual({ role: 'model', parts: raw });
    expect(contents[2]).toEqual({
      role: 'user',
      parts: [
        { functionResponse: { id: 'c1', name: 'launch_app', response: { ok: true, message: 'ochildi' } } },
        { functionResponse: { name: 'get_system_info', response: { result: 'matn' } } },
      ],
    });
  });
});

describe('Ollama function calling', () => {
  it('tool_calls ni o‘qiydi (arguments obyekt yoki JSON matn)', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          streamOf([
            `${JSON.stringify({ message: { content: '', tool_calls: [{ function: { name: 'launch_app', arguments: { name: 'Notepad' } } }] }, done: false })}\n`,
            `${JSON.stringify({ message: { content: '', tool_calls: [{ function: { name: 'get_disk_usage', arguments: '{}' } }] }, done: true })}\n`,
          ]),
        ),
    );
    const p = createOllamaProvider({
      baseUrl: () => 'http://127.0.0.1:11434',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const events = await collect(
      p.streamChat(
        { model: 'm', system: 's', messages: [{ role: 'user', content: 'x' }], tools: decl },
        new AbortController().signal,
      ),
    );
    const ev = events[0] as Extract<StreamEvent, { type: 'tool_calls' }>;
    expect(ev.calls.map((c) => [c.name, c.args])).toEqual([
      ['launch_app', { name: 'Notepad' }],
      ['get_disk_usage', {}],
    ]);
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.tools[0]).toEqual({ type: 'function', function: decl[0] });
  });

  it('model vositalarni qo‘llamasa → AI_TOOLS_UNSUPPORTED', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: 'registry/model does not support tools' }), { status: 400 }),
    );
    const p = createOllamaProvider({
      baseUrl: () => 'http://127.0.0.1:11434',
      fetch: fetchMock as unknown as typeof fetch,
    });
    await expect(
      collect(
        p.streamChat({ model: 'm', system: 's', messages: [], tools: decl }, new AbortController().signal),
      ),
    ).rejects.toMatchObject({
      code: 'AI_TOOLS_UNSUPPORTED',
    });
  });

  it('tarix formati: assistant tool_calls va role "tool" + tool_name', () => {
    expect(
      toOllamaMessages('SYS', [
        { role: 'assistant', content: '', toolCalls: [{ id: 'x', name: 'launch_app', args: { name: 'A' } }] },
        { role: 'tool', callId: 'x', name: 'launch_app', result: { ok: true } },
      ]),
    ).toEqual([
      { role: 'system', content: 'SYS' },
      {
        role: 'assistant',
        content: '',
        tool_calls: [{ function: { name: 'launch_app', arguments: { name: 'A' } } }],
      },
      { role: 'tool', content: '{"ok":true}', tool_name: 'launch_app' },
    ]);
  });
});

let cleanup: (() => void) | undefined;
afterEach(() => cleanup?.());

function chatWith(provider: AIProvider, tools: ToolRunner) {
  const t = tempDatabase();
  cleanup = t.cleanup;
  const events: ChatEvent[] = [];
  const service = new ChatService({
    stores: { persistent: new SqliteConversationStore(t.db), memory: new MemoryConversationStore() },
    saveHistory: () => true,
    resolveProvider: async () => ({ provider, model: 'm' }),
    emit: (e) => events.push(e),
    logger,
    tools,
  });
  return { service, events };
}

function scripted(
  steps: ((req: ChatRequest) => StreamEvent[] | Error)[],
): AIProvider & { requests: ChatRequest[] } {
  const requests: ChatRequest[] = [];
  return {
    id: 'ollama',
    requests,
    getCapabilities: () => ({ streaming: true, tools: true, vision: false, cloud: false }),
    listModels: async () => [],
    async *streamChat(req) {
      requests.push(structuredClone(req));
      const step = steps[requests.length - 1];
      const out = step ? step(req) : [{ type: 'text' as const, text: 'oxiri' }];
      if (out instanceof Error) throw out;
      for (const e of out) yield e;
    },
  };
}

describe('ChatService vosita tsikli', () => {
  it('model → launch_app → natija modelga → yakuniy javob', async () => {
    const provider = scripted([
      () => [
        { type: 'tool_calls', calls: [{ id: 'call-1', name: 'launch_app', args: { name: 'Calculator' } }] },
      ],
      () => [{ type: 'text', text: 'Kalkulyator ochildi.' }],
    ]);
    const execute = vi.fn(async () => ({ ok: true, verified: true, message: 'Calculator ochildi.' }));
    const { service, events } = chatWith(provider, {
      declarations: () => decl,
      execute,
      activitiesFor: () => [],
    });
    const r = await service.send(null, 'Kalkulyatorni och');
    await vi.waitFor(() => expect(events.some((e) => e.type === 'done')).toBe(true));

    expect(execute).toHaveBeenCalledTimes(1);
    expect((execute.mock.calls[0] as unknown[])[0]).toMatchObject({
      name: 'launch_app',
      args: { name: 'Calculator' },
    });
    expect(provider.requests[0]!.tools).toEqual(decl);
    expect(provider.requests[0]!.system).toContain('vositalar (tools) orqali');
    const second = provider.requests[1]!.messages;
    expect(second.at(-1)).toMatchObject({
      role: 'tool',
      name: 'launch_app',
      result: { ok: true, verified: true },
    });
    expect(service.getConversation(r.conversationId).messages.at(-1)!.content).toBe('Kalkulyator ochildi.');
  });

  it('model vositalarni qo‘llamasa: vositalarsiz va “amal bajara olmaysan” ko‘rsatmasi bilan qayta urinadi', async () => {
    const provider = scripted([
      () => new ProviderError('AI_TOOLS_UNSUPPORTED'),
      () => [{ type: 'text', text: 'Hozir buni qila olmayman.' }],
    ]);
    const { service, events } = chatWith(provider, {
      declarations: () => decl,
      execute: vi.fn(),
      activitiesFor: () => [],
    });
    await service.send(null, 'Kalkulyatorni och');
    await vi.waitFor(() => expect(events.some((e) => e.type === 'done')).toBe(true));
    expect(provider.requests[1]!.tools).toBeUndefined();
    expect(provider.requests[1]!.system).toContain('HECH QANDAY amal bajara olmaysan');
  });

  it('cheksiz vosita tsikli to‘xtatiladi', async () => {
    const loop = () => [
      { type: 'tool_calls' as const, calls: [{ id: 'c', name: 'get_disk_usage', args: {} }] },
    ];
    const provider = scripted(Array.from({ length: 20 }, () => loop));
    const execute = vi.fn(async () => ({ ok: true, verified: null, message: 'ok' }));
    const { service, events } = chatWith(provider, {
      declarations: () => decl,
      execute,
      activitiesFor: () => [],
    });
    await service.send(null, 'x');
    await vi.waitFor(() => expect(events.some((e) => e.type === 'done')).toBe(true));
    expect(execute.mock.calls.length).toBeLessThanOrEqual(6);
  });
});
